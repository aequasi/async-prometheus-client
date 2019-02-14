import AbstractAdapter from './Adapter/AbstractAdapter';
import InMemoryAdapter from './Adapter/InMemoryAdapter';
import {Counter, Gauge, Histogram, MetricInterface} from './Metric';
import MetricFamilySamples from './MetricFamilySamples';

export default class Registry {
    public static getDefault(): Registry {
        if (!Registry.defaultRegistry) {
            Registry.defaultRegistry = new Registry(new InMemoryAdapter());
        }

        return Registry.defaultRegistry;
    }

    private static defaultRegistry: Registry;

    public readonly storageAdapter: AbstractAdapter;

    private readonly gauges: Gauge[] = [];

    private readonly counters: Counter[] = [];

    private readonly histograms: Histogram[] = [];

    public constructor(adapter: AbstractAdapter) {
        this.storageAdapter = adapter;
    }

    public async getMetricFamilySamples(): Promise<MetricFamilySamples[]> {
        return this.storageAdapter.collect();
    }

    public registerCounter(config: Partial<MetricInterface>): Counter {
        const metricIdentifier = this.metricIdentifier(config.namespace, config.name);
        if (this.counters[metricIdentifier] !== undefined) {
            throw new Error('Metric already registered');
        }
        this.counters[metricIdentifier] = new Counter(this.storageAdapter, config);

        return this.counters[metricIdentifier];
    }

    public getCounter(namespace: string, name: string): Counter {
        const metricIdentifier = this.metricIdentifier(namespace, name);
        if (this.counters[metricIdentifier] === undefined) {
            throw new Error('Metric is not registered');
        }

        return this.counters[metricIdentifier];
    }

    public getOrRegisterCounter(config: Partial<MetricInterface>): Counter {
        try {
            return this.getCounter(config.namespace, config.name);
        } catch (e) {
            return this.registerCounter(config);
        }
    }

    public registerGauge(config: Partial<MetricInterface>): Gauge {
        const metricIdentifier = this.metricIdentifier(config.namespace, config.name);
        if (this.gauges[metricIdentifier] !== undefined) {
            throw new Error('Metric already registered');
        }
        this.gauges[metricIdentifier] = new Gauge(this.storageAdapter, config);

        return this.gauges[metricIdentifier];
    }

    public getGauge(namespace: string, name: string): Gauge {
        const metricIdentifier = this.metricIdentifier(namespace, name);
        if (this.gauges[metricIdentifier] === undefined) {
            throw new Error('Metric is not registered');
        }

        return this.gauges[metricIdentifier];
    }

    public getOrRegisterGauge(config: Partial<MetricInterface>): Gauge {
        try {
            return this.getGauge(config.namespace, config.name);
        } catch (e) {
            return this.registerGauge(config);
        }
    }

    public registerHistogram(config: Partial<MetricInterface>): Histogram {
        const metricIdentifier = this.metricIdentifier(config.namespace, config.name);
        if (this.histograms[metricIdentifier] !== undefined) {
            throw new Error('Metric already registered');
        }
        this.histograms[metricIdentifier] = new Histogram(this.storageAdapter, config);

        return this.histograms[metricIdentifier];
    }

    public getHistogram(namespace: string, name: string): Histogram {
        const metricIdentifier = this.metricIdentifier(namespace, name);
        if (this.histograms[metricIdentifier] === undefined) {
            throw new Error('Metric is not registered');
        }

        return this.histograms[metricIdentifier];
    }

    public getOrRegisterHistogram(config: Partial<MetricInterface>): Histogram {
        try {
            return this.getHistogram(config.namespace, config.name);
        } catch (e) {
            return this.registerHistogram(config);
        }
    }

    private metricIdentifier(namespace: string, name: string): string {
        return `${namespace}:${name}`;
    }
}
