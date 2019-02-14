import Sample, {SampleInterface} from './Sample';

export interface MetricFamilySamplesInterface {
    name: string;
    type: string;
    help: string;
    labelNames: string[];
    buckets?: Array<number | string>;
    samples: SampleInterface[];
}

export default class MetricFamilySamples {
    public readonly name: string;

    public readonly type: string;

    public readonly help: string;

    public readonly labelNames: string[];

    public readonly samples: Sample[] = [];

    public constructor(init: Partial<MetricFamilySamplesInterface>) {
        const samples = init.samples.map((sample) => new Sample(sample));
        Object.assign(this, init, {samples});
    }

    public hasLabelNames(): boolean {
        return this.labelNames && this.labelNames.length > 0;
    }
}
