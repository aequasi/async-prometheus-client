import {expect, use} from 'chai';
import 'mocha';
import * as sinonChai from 'sinon-chai';
import {stubInterface} from 'ts-sinon';

import InMemoryAdapter from '../Adapter/InMemoryAdapter';
import Gauge from './Gauge';

use(sinonChai);

describe('src/Metric/Gauge.ts', () => {
    it('should allow the user to single increment a metric', async () => {
        const adapter: any = stubInterface<InMemoryAdapter>(['updateGauge']);
        const config       = {name: 'foo', help: 'a', labels: ['foo']};

        const gauge = new Gauge(adapter, config);
        await gauge.inc(['foo']);

        expect(adapter.updateGauge).to.have.been.calledOnceWith();
    });

    it('should allow the user to numerically increment a metric', async () => {
        const adapter: any = stubInterface<InMemoryAdapter>(['updateGauge']);
        const config       = {name: 'foo', help: 'a', labels: ['foo']};

        const gauge = new Gauge(adapter, config);
        await gauge.incBy(5, ['foo']);

        expect(adapter.updateGauge).to.have.been.calledOnceWith();
    });

    it('should allow the user to single decrement a metric', async () => {
        const adapter: any = stubInterface<InMemoryAdapter>(['updateGauge']);
        const config       = {name: 'foo', help: 'a', labels: ['foo']};

        const gauge = new Gauge(adapter, config);
        await gauge.dec(['foo']);

        expect(adapter.updateGauge).to.have.been.calledOnceWith();
    });

    it('should allow the user to numerically decrement a metric', async () => {
        const adapter: any = stubInterface<InMemoryAdapter>(['updateGauge']);
        const config       = {name: 'foo', help: 'a', labels: ['foo']};

        const gauge = new Gauge(adapter, config);
        await gauge.decBy(5, ['foo']);

        expect(adapter.updateGauge).to.have.been.calledOnceWith();
    });

    it('should allow the user to set a metric', async () => {
        const adapter: any = stubInterface<InMemoryAdapter>(['updateGauge']);
        const config       = {name: 'foo', help: 'a', labels: ['foo']};

        const gauge = new Gauge(adapter, config);
        await gauge.set(5, ['foo']);

        expect(adapter.updateGauge).to.have.been.calledOnceWith();
    });
});
