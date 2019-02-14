import {expect, use} from 'chai';
import 'mocha';
import * as sinonChai from 'sinon-chai';
import {stubInterface} from 'ts-sinon';

import InMemoryAdapter from './Adapter/InMemoryAdapter';
import {Counter, Gauge, Histogram} from './Metric';
import Registry from './Registry';

use(sinonChai);

const metrics = Object.entries({Counter, Gauge, Histogram});

const getRegistry = () => {
    const adapter = stubInterface<InMemoryAdapter>();

    return {
        registry: new Registry(adapter),
        adapter,
    };
};

describe('src/Registry.ts', () => {
    it('should have the default be a singleton', () => {
        const registry = Registry.getDefault();

        expect(registry).to.eq(Registry.getDefault());
    });
    it('should default to an InMemory Adapter', () => {
        expect(Registry.getDefault()).to.be.instanceOf(Registry);
        expect(Registry.getDefault().storageAdapter).to.be.instanceOf(InMemoryAdapter);
    });
    it('should construct properly', () => {
        const adapter = stubInterface<InMemoryAdapter>();

        expect(new Registry(adapter)).to.be.instanceOf(Registry);
    });
    it('should let you register metrics', () => {
        const {registry} = getRegistry();

        for (const [k, v] of metrics) {
            const metric = registry['register' + k].call(registry, {name: k, help: k});
            expect(metric).to.be.instanceOf(v);
        }
    });

    it('should error when you try to register a metric twice', () => {
        const {registry} = getRegistry();
        for (const [k] of metrics) {
            const metric = () => registry['register' + k].call(registry, {name: k, help: k});
            metric();
            expect(metric).to.throw('Metric already registered');
        }
    });

    it('should should return the same metric when you try to getOrRegister a metric twice', () => {
        const {registry} = getRegistry();

        for (const [k] of metrics) {
            const create = () => registry['getOrRegister' + k].call(registry, {name: k, help: k});
            const metric = create();
            expect(create()).to.be.eq(metric);
        }
    });

    it('should should return the metric when you try to get* a metric', () => {
        const {registry} = getRegistry();

        for (const [k] of metrics) {
            const metric = registry['register' + k].call(registry, {namespace: 'test', name: k, help: k});

            expect(registry['get' + k].call(registry, 'test', k)).to.be.eq(metric);
        }
    });

    it('should call storageAdapter.collect() when calling getMetricFamilySamples()', async () => {
        const {registry, adapter} = getRegistry();

        await registry.getMetricFamilySamples();

        expect(adapter.collect).to.have.been.calledOnceWith();
    });
});
