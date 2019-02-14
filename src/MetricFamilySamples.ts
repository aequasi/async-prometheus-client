import {Types} from './Constants';
import Sample, {SampleInterface} from './Sample';

export interface MetricFamilySamplesInterface {
    name: string;
    type: Types;
    help: string;
    labelNames: string[];
    buckets?: Array<number | string>;
    samples?: SampleInterface[];
}

export default class MetricFamilySamples {
    public readonly name: string;

    public readonly type: Types;

    public readonly help: string;

    public readonly labelNames: string[] = [];

    public readonly buckets: Array<number | string> = [];

    public readonly samples: Sample[] = [];

    public constructor(init: MetricFamilySamplesInterface) {
        const samples = (init.samples || []).map((sample) => new Sample(sample));
        Object.assign(this, init, {samples});

        if (this.name === undefined) {
            throw new Error('Name must be defined');
        }

        if (this.type === undefined) {
            throw new Error('Type must be defined');
        }

        if (this.help === undefined) {
            throw new Error('Help must be defined');
        }
    }

    public hasLabelNames(): boolean {
        return this.labelNames && this.labelNames.length > 0;
    }
}
