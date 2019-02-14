export default interface DataInterface {
    name: string;
    help: string;
    type: string;
    command?: number;
    labelNames: string[];
    labelValues: string[];
    buckets?: Array<string | number>;
    value: number;
}
