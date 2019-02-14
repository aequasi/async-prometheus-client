import AbstractAdapter from '../Adapter/AbstractAdapter';
import MetricInterface from './MetricInterface';
import {createHash} from 'crypto';

const sha = createHash('sha1');

export const RE_METRIC_LABEL_NAME = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
export default abstract class AbstractMetric implements MetricInterface {
    public readonly namespace: string;
    public readonly name: string;
    public readonly help: string;
    public readonly labels: string[] = [];

    public readonly metricName: string;
    public constructor(protected storageAdapter: AbstractAdapter, config: Partial<MetricInterface>) {
        Object.assign(this, config);
        this.metricName = (this.namespace ? this.namespace + '_' : '') + name;
        if (!RE_METRIC_LABEL_NAME.test(this.metricName)) {
            throw new Error('Invalid metric name: ' + this.metricName);
        }

        for (const label of this.labels) {
            if (!RE_METRIC_LABEL_NAME.test(label)) {
                throw new Error(`Invalid metric label for metric "${this.metricName}": ${label}`);
            }
        }
    }

    public abstract getType(): string;

    public getKey(): string {
        return sha.update((this.metricName + JSON.stringify(this.labels))).digest("hex");
    }

    protected assertLabelsAreDefinedCorrectly(labels: string[]) {
        if (labels.length !== this.labels.length) {
            throw new Error(`Labels are not defined correctly: ${JSON.stringify(labels)}`);
        }
    }
}
