import MetricFamilySamples from '../MetricFamilySamples';
import {SampleInterface} from '../Sample';
import DataInterface from './DataInterface';

export interface Metadata {
    name: string;
    help: string;
    type: string;
    labelNames: string[];
    buckets?: Array<string | number>;
    samples?: SampleInterface[];
}

export default abstract class AbstractAdapter {
    public static COMMAND_INCREMENT_INTEGER = 1;

    public static COMMAND_INCREMENT_FLOAT   = 2;

    public static COMMAND_SET               = 3;

    public abstract flush(): Promise<void>;

    public abstract collect(): Promise<MetricFamilySamples[]>;

    public abstract updateCounter(data: DataInterface): Promise<void>;

    public abstract updateGauge(data: DataInterface): Promise<void>;

    public abstract updateHistogram(data: DataInterface): Promise<void>;

    protected metaKey(data: DataInterface): string {
        return `${data.type}:${data.name}:meta`;
    }

    protected metaData(data: DataInterface): Metadata {
        const {value, command, labelValues, ...metadata} = data;

        return metadata;
    }
}
