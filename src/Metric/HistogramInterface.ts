import MetricInterface from './MetricInterface';

export default interface HistogramInterface extends MetricInterface {
    buckets: Array<string | number>;
}
