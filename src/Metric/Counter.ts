import AbstractAdapter from '../Adapter/AbstractAdapter';
import AbstractMetric from './AbstractMetric';

export default class Counter extends AbstractMetric {
    public getType(): string {
        return 'counter';
    }

    public async inc(labels: string[] = []): Promise<void> {
        return this.incBy(1, labels);
    }

    private async incBy(value: number, labels: string[] = []): Promise<void> {
        this.assertLabelsAreDefinedCorrectly(labels);

        return this.storageAdapter.updateCounter({
            name:        this.metricName,
            help:        this.help,
            type:        this.getType(),
            labelNames:  this.labels,
            labelValues: labels,
            command:     AbstractAdapter.COMMAND_INCREMENT_INTEGER,
            value,
        });
    }
}
