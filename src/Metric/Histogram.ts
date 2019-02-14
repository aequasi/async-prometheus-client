import AbstractAdapter from '../Adapter/AbstractAdapter';
import {Types} from '../Constants';
import AbstractMetric from './AbstractMetric';
import HistogramInterface from './HistogramInterface';

export default class Histogram extends AbstractMetric implements HistogramInterface {
    public static getDefaultBuckets(): number[] {
        return [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0];
    }

    public readonly buckets: Array<string|number>;

    public constructor(storageAdapter: AbstractAdapter, config: Partial<HistogramInterface>) {
        super(storageAdapter, config);

        if (config.buckets === null) {
            this.buckets = Histogram.getDefaultBuckets();
        } else {
            this.buckets = config.buckets;
        }

        if (this.buckets.length === 0) {
            throw new Error('Histogram must have at least one bucket.');
        }

        for (let i = 0; i < this.buckets.length; i++) {
            if (this.buckets[i] >= this.buckets[i + 1]) {
                throw new Error(
                    `Histogram buckets must be in increasing order: ${this.buckets[i]} >= ${this.buckets[i + 1]}`,
                );
            }
        }

        for (const label of config.labels) {
            if (label === 'le') {
                throw new Error('Histogram cannot have a label named "le".');
            }
        }
    }

    public getType(): Types {
        return 'histogram';
    }

    public async observe(value: number, labels: string[] = []): Promise<void> {
        this.assertLabelsAreDefinedCorrectly(labels);

        return this.storageAdapter.updateHistogram({
            name:        this.metricName,
            help:        this.help,
            type:        this.getType(),
            labelNames:  this.labels,
            labelValues: labels,
            buckets:     this.buckets,
            value,
        });
    }
}
