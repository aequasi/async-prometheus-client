import AbstractAdapter from '../Adapter/AbstractAdapter';
import {Types} from '../Constants';
import AbstractMetric from './AbstractMetric';

export default class Counter extends AbstractMetric {
    public getType(): Types {
        return 'counter';
    }

    public async inc(labels: string[] = []): Promise<void> {
        return this.incBy(1, labels);
    }

    public async incBy(value: number, labels: string[] = []): Promise<void> {
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
