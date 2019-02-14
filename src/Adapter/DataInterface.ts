import {Types} from '../Constants';

export default interface DataInterface {
    name: string;
    help: string;
    type: Types;
    command?: number;
    labelNames: string[];
    labelValues: string[];
    buckets?: Array<string | number>;
    value: number;
}
