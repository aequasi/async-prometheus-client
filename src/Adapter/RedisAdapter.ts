import redis from 'redis';
import MetricFamilySamples, {MetricFamilySamplesInterface} from '../MetricFamilySamples';
import {SampleInterface} from '../Sample';
import AbstractAdapter from './AbstractAdapter';
import DataInterface from './DataInterface';

export const PROMETHEUS_METRIC_KEYS_SUFFIX = '_METRIC_KEYS';

export default class RedisAdapter extends AbstractAdapter {
    private readonly client: redis.RedisClient;

    constructor(options: redis.ClientOpts | redis.RedisClient) {
        super();

        if (options instanceof redis.RedisClient) {
            this.client = options;
        } else {
            this.client = redis.createClient(options);
        }
    }

    public async flush(): Promise<void> {
        await this.client.flushall();
    }

    public async collect(): Promise<MetricFamilySamples[]> {
        return [
            ...await this.collectCounters(),
            ...await this.collectGauges(),
            ...await this.collectHistograms(),
        ];
    }

    public async updateCounter(data: DataInterface): Promise<void> {
        return new Promise((resolve, reject) => {
            const key      = this.metaKey(data);
            const metadata = this.metaData(data);
            this.client.hincrby(key, JSON.stringify(data.labelValues), data.value, (err, reply) => {
                if (err) {
                    return reject(err);
                }

                if (reply !== data.value) {
                    return resolve();
                }

                this.client.hmset(key, '__meta', JSON.stringify(metadata), (err2) => {
                    if (err2) {
                        return reject(err2);
                    }

                    this.client.sadd('counter' + PROMETHEUS_METRIC_KEYS_SUFFIX, (err3) => {
                        err3 ? reject(err3) : resolve();
                    });
                });
            });
        });
    }

    public async updateGauge(data: DataInterface): Promise<void> {
        return new Promise((resolve, reject) => {
            const key      = this.metaKey(data);
            const metadata = this.metaData(data);
            const method   = data.command === AbstractAdapter.COMMAND_SET ? 'hset' : 'hincrbyfloat';
            this.client[method](key, JSON.stringify(data.labelValues), data.value as string & number, (err, reply) => {
                if (err) {
                    return reject(err);
                }

                if (data.command === AbstractAdapter.COMMAND_SET) {
                    if (reply !== 1) {
                        return resolve();
                    }
                } else {
                    if (reply !== data.value) {
                        return resolve();
                    }
                }

                this.client.hset(key, '__meta', JSON.stringify(metadata), (err2) => {
                    if (err2) {
                        return reject(err2);
                    }

                    this.client.sadd('gauge' + PROMETHEUS_METRIC_KEYS_SUFFIX, (err3) => {
                        err3 ? reject(err3) : resolve();
                    });
                });
            });
        });
    }

    public async updateHistogram(data: DataInterface): Promise<void> {
        return new Promise((resolve, reject) => {
            let bucketToIncrease = '+Inf';
            for (const b of data.buckets) {
                const bucket = parseInt(b as string, 10);
                if (!isNaN(bucket) && data.value < bucket) {
                    bucketToIncrease = b as string;
                    break;
                }
            }

            const key      = this.metaKey(data);
            const metadata = this.metaData(data);
            const field1   = JSON.stringify({b: 'sum', labelValues: data.labelValues});
            const field2   = JSON.stringify({b: bucketToIncrease, labelValues: data.labelValues});
            this.client.hincrbyfloat(key, field1, data.value, (err, reply) => {
                if (err) {
                    return reject(err);
                }
                this.client.hincrby(key, field2, 1, (err2) => {
                    if (err2) {
                        return reject(err2);
                    }

                    if (parseFloat(reply) !== data.value) {
                        return resolve();
                    }

                    this.client.hset(key, '__meta', JSON.stringify(metadata), (err3) => {
                        if (err3) {
                            return reject(err3);
                        }

                        this.client.sadd('histogram' + PROMETHEUS_METRIC_KEYS_SUFFIX, (err4) => {
                            err4 ? reject(err4) : resolve();
                        });
                    });
                });
            });
        });
    }

    private async collectHistograms(): Promise<MetricFamilySamples[]> {
        const keys = await this.getKeys('histogram' + PROMETHEUS_METRIC_KEYS_SUFFIX);
        keys.sort();
        const histograms: MetricFamilySamples[] = [];
        for (const key of keys) {
            const raw                                     = await this.hGetAll(key);
            const histogram: MetricFamilySamplesInterface = JSON.parse(raw.__meta);
            delete raw.__meta;
            histogram.samples = [];
            histogram.buckets.push('+Inf');

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
                for (const bucket of histogram.buckets) {
                    const bucketKey = JSON.stringify({b: bucket, labelValues});
                    if (raw[bucketKey] !== undefined) {
                        acc += parseInt(raw[bucketKey], 10);
                    }
                    histogram.samples.push({
                        name:        histogram.name + '_bucket',
                        labelNames:  ['le'],
                        labelValues: labelValues.concat([bucket as string]),
                        value:       acc,
                    });
                }

                histogram.samples.push({
                    name:       histogram.name + '_count',
                    labelNames: [],
                    value:      acc,
                    labelValues,
                });

                histogram.samples.push({
                    name:       histogram.name + '_sum',
                    labelNames: [],
                    value:      parseInt(raw[JSON.stringify({b: 'sum', labelValues})], 10),
                    labelValues,
                });
            }
            histograms.push(new MetricFamilySamples(histogram));
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
            const raw                                 = await this.hGetAll(key);
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

}
