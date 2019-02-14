import AbstractAdapter from '../Adapter/AbstractAdapter';
import {Types} from '../Constants';
import AbstractMetric from './AbstractMetric';

export default class Gauge extends AbstractMetric {
    public getType(): Types {
        return 'gauge';
    }

    public async inc(labels: string[] = []): Promise<void> {
        return this.incBy(1, labels);
    }

    public async incBy(value: number, labels: string[] = []): Promise<void> {
        this.assertLabelsAreDefinedCorrectly(labels);

        return this.storageAdapter.updateGauge({
            name:        this.metricName,
            help:        this.help,
            type:        this.getType(),
            labelNames:  this.labels,
            labelValues: labels,
            command:     AbstractAdapter.COMMAND_INCREMENT_FLOAT,
            value,
        });
    }

    public async dec(labels: string[] = []): Promise<void> {
        return this.decBy(1, labels);
    }

    public async decBy(value: number, labels: string[] = []): Promise<void> {
        return this.incBy(-value, labels);
    }

    public async set(value: number, labels: string[] = []): Promise<void> {
        this.assertLabelsAreDefinedCorrectly(labels);

        return this.storageAdapter.updateGauge({
            name:        this.metricName,
            help:        this.help,
            type:        this.getType(),
            labelNames:  this.labels,
            labelValues: labels,
            command:     AbstractAdapter.COMMAND_SET,
            value,
        });
    }
}
