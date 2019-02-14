import {expect, use} from 'chai';
import 'mocha';
import * as sinonChai from 'sinon-chai';
import {stubInterface} from 'ts-sinon';

import InMemoryAdapter from '../Adapter/InMemoryAdapter';
import Counter from './Counter';

use(sinonChai);

describe('src/Metric/Counter.ts', () => {
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
