import {expect, use} from 'chai';
import 'mocha';
import * as sinonChai from 'sinon-chai';
import {stubInterface} from 'ts-sinon';

import InMemoryAdapter from '../Adapter/InMemoryAdapter';
import Counter from './Counter';

use(sinonChai);

describe('src/Metric/Counter.ts', () => {
    it('should require a name and a help', () => {
        const adapter = stubInterface<InMemoryAdapter>();

        expect(() => new Counter(adapter, {help: 'foo'})).to.throw('Name must be defined');
        expect(() => new Counter(adapter, {name: 'foo'})).to.throw('Help must be defined');
    });

    it('should combine namespace and name to make the metric name', () => {
        const adapter  = stubInterface<InMemoryAdapter>();
        const counter1 = new Counter(adapter, {name: 'foo', help: 'a'});
        const counter2 = new Counter(adapter, {namespace: 'foo', name: 'bar', help: 'a'});

        expect(counter1.metricName).to.eq('foo');
        expect(counter2.metricName).to.eq('foo_bar');
    });

    it('should validate metric names', () => {
        const adapter = stubInterface<InMemoryAdapter>();
        const config = {name: 'fo#o', help: 'a'};

        expect(() => new Counter(adapter, config)).to.throw('Invalid metric name: ' + config.name);
    });

    it('should validate metric labels', () => {
        const adapter = stubInterface<InMemoryAdapter>();
        const config = {name: 'foo', help: 'a', labels: ['foo', 'ba$r']};

        expect(() => new Counter(adapter, config)).to.throw(`Invalid metric label for metric "${config.name}": ba$r`);
    });

    it('should allow the user to single increment a metric', async () => {
        const adapter: any = stubInterface<InMemoryAdapter>(['updateCounter']);
        const config       = {name: 'foo', help: 'a', labels: ['foo']};

        const counter = new Counter(adapter, config);
        await counter.inc(['foo']);

        expect(adapter.updateCounter).to.have.been.calledOnceWith();
    });

    it('should allow the user to numerically increment a metric', async () => {
        const adapter: any = stubInterface<InMemoryAdapter>(['updateCounter']);
        const config       = {name: 'foo', help: 'a', labels: ['foo']};

        const counter = new Counter(adapter, config);
        await counter.incBy(5, ['foo']);

        expect(adapter.updateCounter).to.have.been.calledOnceWith();
    });
});
