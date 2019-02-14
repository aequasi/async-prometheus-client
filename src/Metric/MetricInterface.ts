export default interface MetricInterface {
    metricName: string;
    namespace: string;
    name: string;
    help: string;
    labels: string[];
}
