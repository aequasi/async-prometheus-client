import MetricFamilySamples, {MetricFamilySamplesInterface} from '../MetricFamilySamples';
import {SampleInterface} from '../Sample';
import AbstractAdapter, {Metadata} from './AbstractAdapter';
import DataInterface from './DataInterface';

interface MetricWithMetadataInterface {
    meta: Metadata;
    samples?: { [key: string]: number };
}

export default class InMemoryAdapter extends AbstractAdapter {
    private readonly counters: MetricWithMetadataInterface[];

    private readonly gauges: MetricWithMetadataInterface[];

    private readonly histograms: MetricWithMetadataInterface[];

    public async collect(): Promise<MetricFamilySamples[]> {
        return [
            ...await this.internalCollect(this.counters),
            ...await this.internalCollect(this.gauges),
            ...await this.collectHistograms(),
        ];
    }

    public async flush(): Promise<void> {
        this.counters.length   = 0;
        this.gauges.length     = 0;
        this.histograms.length = 0;
    }

    public async updateCounter(data: DataInterface): Promise<void> {
        const metaKey  = this.metaKey(data);
        const valueKey = this.valueKey(data);
        if (this.counters[metaKey] === undefined) {
            this.counters[metaKey] = {
                meta:    this.metaData(data),
                samples: {},
            };
        }
        if (this.counters[metaKey]['samples'][valueKey] === undefined) {
            this.counters[metaKey]['samples'][valueKey] = 0;
        }
        if (data.command === AbstractAdapter.COMMAND_SET) {
            this.counters[metaKey]['samples'][valueKey] = 0;
        } else {
            this.counters[metaKey]['samples'][valueKey] += data.value;
        }
    }

    public async updateGauge(data: DataInterface): Promise<void> {
        const metaKey  = this.metaKey(data);
        const valueKey = this.valueKey(data);
        if (this.gauges[metaKey] === undefined) {
            this.gauges[metaKey] = {
                meta:    this.metaData(data),
                samples: {},
            };
        }
        if (this.gauges[metaKey]['samples'][valueKey] === undefined) {
            this.gauges[metaKey]['samples'][valueKey] = 0;
        }
        if (data.command === AbstractAdapter.COMMAND_SET) {
            this.gauges[metaKey]['samples'][valueKey] = data.value;
        } else {
            this.gauges[metaKey]['samples'][valueKey] += data.value;
        }
    }

    public async updateHistogram(data: DataInterface): Promise<void> {
        const metaKey = this.metaKey(data);
        if (this.histograms[metaKey] === undefined) {
            this.histograms[metaKey] = {
                meta:    this.metaData(data),
                samples: {},
            };
        }
        const sumKey = this.histogramBucketValueKey(data, 'sum');
        if (this.histograms[metaKey]['samples'][sumKey] === undefined) {
            this.histograms[metaKey]['samples'][sumKey] = 0;
        }
        this.histograms[metaKey]['samples'][sumKey] += data.value;

        let bucketToIncrease: string = '+Inf';
        for (const b of data.buckets) {
            const bucket = parseInt(b as string, 10);
            if (!isNaN(bucket) && data.value < bucket) {
                bucketToIncrease = b as string;
                break;
            }
        }
        const bucketKey = this.histogramBucketValueKey(data, bucketToIncrease);
        if (this.histograms[metaKey]['samples'][bucketKey] === undefined) {
            this.histograms[metaKey]['samples'][bucketKey] = 0;
        }
        this.histograms[metaKey]['samples'][bucketKey] += data.value;
    }

    private valueKey(data: DataInterface): string {
        return `${data.type}:${data.name}:${this.encodeLabelValues(data.labelValues)}:value`;
    }

    private histogramBucketValueKey(data: DataInterface, bucket: string): string {
        return `${data.type}:${data.name}:${this.encodeLabelValues(data.labelValues)}:${bucket}`;
    }

    private async collectHistograms(): Promise<MetricFamilySamples[]> {
        const histograms: MetricFamilySamples[] = [];
        for (const histogram of this.histograms) {
            const metadata                           = histogram.meta;
            const data: MetricFamilySamplesInterface = {
                name:       metadata.name,
                help:       metadata.help,
                type:       metadata.type,
                labelNames: metadata.labelNames,
                buckets:    metadata.buckets,
                samples:    [],
            };

            // Add the Inf bucket so we can compute it later on
            data.buckets.push('+Inf');

            const histogramBuckets = {};
            for (const [key, value] of Object.entries(histogram.samples)) {
                const parts       = key.split(':');
                const labelValues = parts[2];
                const bucket      = parts[3];
                if (!histogramBuckets[labelValues]) {
                    histogramBuckets[labelValues] = {};
                }
                histogramBuckets[labelValues][bucket] = value;
            }

            const labels = Object.keys(histogramBuckets).sort();
            for (const labelValues of labels) {
                let acc                  = 0;
                const decodedLabelValues = this.decodeLabelValues(labelValues);
                for (const bucket of data.buckets) {
                    if (histogramBuckets[labelValues][bucket]) {
                        acc += histogramBuckets[labelValues][bucket];
                    }
                    data.samples.push({
                        name:        metadata.name + '_bucket',
                        labelNames:  ['le'],
                        labelValues: decodedLabelValues.concat([bucket as string]),
                        value:       acc,
                    });
                }

                data.samples.push({
                    name:        metadata.name + '_count',
                    labelNames:  [],
                    labelValues: decodedLabelValues,
                    value:       acc,
                });
                data.samples.push({
                    name:        metadata.name + '_sum',
                    labelNames:  [],
                    labelValues: decodedLabelValues,
                    value:       histogramBuckets[labelValues]['sum'],
                });
            }
            histograms.push(new MetricFamilySamples(data));
        }

        return histograms;
    }

    private async internalCollect(metrics: MetricWithMetadataInterface[]): Promise<MetricFamilySamples[]> {
        const result = [];
        for (const metric of metrics) {
            const metadata                           = metric.meta;
            const data: MetricFamilySamplesInterface = {
                name:       metadata.name,
                help:       metadata.help,
                type:       metadata.type,
                labelNames: metadata.labelNames,
                samples:    [],
            };
            for (const [key, value] of Object.entries(metric.samples)) {
                const parts       = key.split(':');
                const labelValues = parts[2];
                data.samples.push({
                    name:        metadata.name,
                    labelNames:  [],
                    labelValues: this.decodeLabelValues(labelValues),
                    value,
                });
            }
            this.sortSamples(data.samples);
            result.push(data);
        }

        return result;
    }

    private sortSamples(samples: SampleInterface[]): void {
        samples.sort((a, b) => a.labelValues.join('').localeCompare(b.labelValues.join('')));
    }

    private decodeLabelValues(labelValues: string): string[] {
        return JSON.parse(atob(labelValues));
    }

    private encodeLabelValues(values: string[]): string {
        return btoa(JSON.stringify(values));
    }
}
