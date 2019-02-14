export interface SampleInterface {
    name: string;
    labelNames: string[];
    labelValues: string[];
    value: number;
}

export default class Sample {
    public readonly name: string;

    public readonly labelNames: string[] = [];

    public readonly labelValues: string[] = [];

    public readonly value: number;

    public constructor(init: SampleInterface) {
        Object.assign(this, init);
        if (this.name === undefined) {
            throw new Error('Name must be defined');
        }
        if (this.value === undefined) {
            throw new Error('Value must be defined');
        }
    }

    public hasLabelNames(): boolean {
        return this.labelNames && this.labelNames.length > 0;
    }
}
