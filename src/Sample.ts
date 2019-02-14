export interface SampleInterface {
    name: string;
    labelNames: string[];
    labelValues: string[];
    value: number;
}

export default class Sample {
    public readonly name: string;

    public readonly labelNames: string[];

    public readonly labelValues: string[];

    public readonly value: number;

    public constructor(init: Partial<SampleInterface>) {
        Object.assign(this, init);
    }

    public hasLabelNames(): boolean {
        return this.labelNames && this.labelNames.length > 0;
    }
}
