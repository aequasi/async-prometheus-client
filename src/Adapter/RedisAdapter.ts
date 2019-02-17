import {ClientOpts, createClient, RedisClient} from 'redis';
import MetricFamilySamples, {MetricFamilySamplesInterface} from '../MetricFamilySamples';
import {SampleInterface} from '../Sample';
import AbstractAdapter from './AbstractAdapter';
import DataInterface from './DataInterface';

export const PROMETHEUS_METRIC_KEYS_SUFFIX = '_METRIC_KEYS';

export default class RedisAdapter extends AbstractAdapter {
    public readonly client: RedisClient;

    constructor(options: ClientOpts | RedisClient) {
        super();

        if (options instanceof RedisClient) {
            this.client = options;
        } else {
            this.client = createClient(options);
        }
    }

    public async flush(): Promise<void> {
        await this.client.flushall();
    }

    public async closeClient(): Promise<void> {
        return new Promise((resolve) => this.client.quit(() => resolve()));
    }

    public async collect(): Promise<MetricFamilySamples[]> {
        return [
            ...await this.collectCounters(),
            ...await this.collectGauges(),
            ...await this.collectHistograms(),
        ];
    }

    public async updateCounter(data: DataInterface): Promise<void> {
        const key      = this.metaKey(data);
        const metadata = this.metaData(data);

        try {
            if (await this.hIncBy(key, JSON.stringify(data.labelValues), data.value) !== data.value) {
                return;
            }

            await this.hSet(key, '__meta', JSON.stringify(metadata));
            await this.sAdd('counter' + PROMETHEUS_METRIC_KEYS_SUFFIX, key);
        } catch (e) {
            throw new Error('Failed to update, Redis Error: ' + e.message);
        }
    }

    public async updateGauge(data: DataInterface): Promise<void> {
        const key      = this.metaKey(data);
        const metadata = this.metaData(data);
        const method   = data.command === AbstractAdapter.COMMAND_SET ? 'hSet' : 'hIncByFloat';

        try {
            const reply = await this[method](key, JSON.stringify(data.labelValues), data.value as string & number);
            if (data.command === AbstractAdapter.COMMAND_SET && reply !== 1) {
                return;
            }

            if (data.command !== RedisAdapter.COMMAND_SET && reply !== data.value) {
                return;
            }

            await this.hSet(key, '__meta', JSON.stringify(metadata));
            await this.sAdd('gauge' + PROMETHEUS_METRIC_KEYS_SUFFIX, key);
        } catch (e) {
            throw new Error('Failed to update, Redis Error: ' + e.message);
        }
    }

    public async updateHistogram(data: DataInterface): Promise<void> {
        let bucketToIncrease: string | number = '+Inf';
        for (const b of data.buckets) {
            if (data.value <= b) {
                bucketToIncrease = b;
                break;
            }
        }

        const key      = this.metaKey(data);
        const metadata = this.metaData(data);
        const field1   = JSON.stringify({b: 'sum', labelValues: data.labelValues});
        const field2   = JSON.stringify({b: bucketToIncrease, labelValues: data.labelValues});

        try {
            const reply = await this.hIncByFloat(key, field1, data.value);
            await this.hIncBy(key, field2, 1);
            if (reply !== data.value) {
                return;
            }

            await this.hSet(key, '__meta', JSON.stringify(metadata));
            await this.sAdd('histogram' + PROMETHEUS_METRIC_KEYS_SUFFIX, key);
        } catch (e) {
            throw new Error('Failed to update, Redis Error: ' + e.message);
        }
    }

    private async collectHistograms(): Promise<MetricFamilySamples[]> {
        const keys = await this.getKeys('histogram' + PROMETHEUS_METRIC_KEYS_SUFFIX);
        keys.sort();
        const histograms: MetricFamilySamples[] = [];
        for (const key of keys) {
            const raw                                = await this.hGetAll(key);
            const data: MetricFamilySamplesInterface = {
                ...JSON.parse(raw.__meta),
                samples: [],
            };
            delete raw.__meta;
            if (data.buckets.indexOf('+Inf') === -1) {
                data.buckets.push('+Inf');
            }

            let allLabelValues: string[][] = [];
            for (const k of Object.keys(raw)) {
                const d = JSON.parse(k);
                if (d.b !== 'sum') {
                    allLabelValues.push(d.labelValues);
                }
            }

            // We need set semantics.
            // This is the equivalent of array_unique but for arrays of arrays.
            allLabelValues = [...new Set(allLabelValues.map((x) => JSON.stringify(x)))].map((x) => JSON.parse(x));
            allLabelValues.sort();

            for (const labelValues of allLabelValues) {
                // Fill up all buckets.
                // If the bucket doesn't exist fill in values from
                // the previous one.
                let acc = 0;
                for (const bucket of data.buckets) {
                    const bucketKey = JSON.stringify({b: bucket, labelValues});
                    if (raw[bucketKey] !== undefined) {
                        acc += parseInt(raw[bucketKey], 10);
                    }

                    data.samples.push({
                        name:        data.name + '_bucket',
                        labelNames:  ['le'],
                        labelValues: labelValues.concat([bucket as string]),
                        value:       acc,
                    });
                }

                data.samples.push({
                    name:       data.name + '_count',
                    labelNames: [],
                    value:      acc,
                    labelValues,
                });

                data.samples.push({
                    name:       data.name + '_sum',
                    labelNames: [],
                    value:      parseFloat(raw[JSON.stringify({b: 'sum', labelValues})]),
                    labelValues,
                });
            }
            histograms.push(new MetricFamilySamples(data));
        }

        return histograms;
    }

    private async collectGauges(): Promise<MetricFamilySamples[]> {
        const keys = await this.getKeys('gauge' + PROMETHEUS_METRIC_KEYS_SUFFIX);
        keys.sort();
        const gauges: MetricFamilySamples[] = [];
        for (const key of keys) {
            const raw                                 = await this.hGetAll(key);
            const gauge: MetricFamilySamplesInterface = JSON.parse(raw.__meta);
            delete raw.__meta;
            gauge.samples = [];
            for (const [k, v] of Object.entries(raw)) {
                gauge.samples.push({
                    name:        gauge.name,
                    labelNames:  [],
                    labelValues: JSON.parse(k),
                    value:       parseInt(v, 10),
                });
            }

            this.sortSamples(gauge.samples);
            gauges.push(new MetricFamilySamples(gauge));
        }

        return gauges;
    }

    private async collectCounters(): Promise<MetricFamilySamples[]> {
        const keys = await this.getKeys('counter' + PROMETHEUS_METRIC_KEYS_SUFFIX);
        keys.sort();
        const counters: MetricFamilySamples[] = [];
        for (const key of keys) {
            const raw                                   = await this.hGetAll(key);
            const counter: MetricFamilySamplesInterface = JSON.parse(raw.__meta);
            delete raw.__meta;
            counter.samples = [];
            for (const [k, v] of Object.entries(raw)) {
                counter.samples.push({
                    name:        counter.name,
                    labelNames:  [],
                    labelValues: JSON.parse(k),
                    value:       parseInt(v, 10),
                });
            }

            this.sortSamples(counter.samples);
            counters.push(new MetricFamilySamples(counter));
        }

        return counters;
    }

    private sortSamples(samples: SampleInterface[]): void {
        samples.sort((a, b) => a.labelValues.join('').localeCompare(b.labelValues.join('')));
    }

    private async getKeys(key: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.client.smembers(key, (err, keys) => err ? reject(err) : resolve(keys));
        });
    }

    private async hGetAll(key: string): Promise<{ [key: string]: string, __meta: string }> {
        return new Promise((resolve, reject) => {
            this.client.hgetall(key, (err, reply) => err ? reject(err) : resolve(reply as any));
        });
    }

    private async hIncByFloat(key: string, field: string, value: number): Promise<number> {
        return new Promise((resolve, reject) => {
            this.client.hincrbyfloat(key, field, value, (err, reply) => err ? reject(err) : resolve(parseFloat(reply)));
        });
    }

    private async hIncBy(key: string, field: string, value: number): Promise<number> {
        return new Promise((resolve, reject) => {
            this.client.hincrby(key, field, value, (err, reply) => err ? reject(err) : resolve(reply));
        });
    }

    private async hSet(key: string, field: string, value: string): Promise<number> {
        return new Promise((resolve, reject) => {
            this.client.hset(key, field, value, (err, reply) => err ? reject(err) : resolve(reply));
        });
    }

    private async sAdd(key: string, member: string): Promise<number> {
        return new Promise((resolve, reject) => {
            this.client.sadd(key, member, (err, reply) => err ? reject(err) : resolve(reply));
        });
    }
}
