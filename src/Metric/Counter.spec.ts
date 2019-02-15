import {expect, use} from 'chai';
import 'mocha';
import * as sinonChai from 'sinon-chai';
import {stubInterface} from 'ts-sinon';

import InMemoryAdapter from '../Adapter/InMemoryAdapter';
import Counter from './Counter';

use(sinonChai);

const getLabels = () => [
    [['foo', 'bar'], ['a', 'b']],
    [['foo'], ['a']],
    [undefined, undefined],
];

describe('src/Metric/Counter.ts', () => {
    it('should allow the user to single increment a metric', async () => {
        for (const [labels, values] of getLabels()) {
            const adapter: any = stubInterface<InMemoryAdapter>(['updateCounter']);
            const config       = {name: 'foo', help: 'a', labels};
            if (config.labels === undefined) {
                delete config.labels;
            }

            const counter = new Counter(adapter, config);
            await counter.inc(values);

            expect(adapter.updateCounter).to.have.been.calledOnceWith();
        }
    });

    it('should allow the user to numerically increment a metric', async () => {
        for (const [labels, values] of getLabels()) {
            const adapter: any = stubInterface<InMemoryAdapter>(['updateCounter']);
            const config       = {name: 'foo', help: 'a', labels};
            if (config.labels === undefined) {
                delete config.labels;
            }

            const counter = new Counter(adapter, config);
            await counter.incBy(5, values);

            expect(adapter.updateCounter).to.have.been.calledOnceWith();
        }
    });
});
