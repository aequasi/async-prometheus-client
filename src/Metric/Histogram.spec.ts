import {expect, use} from 'chai';
import 'mocha';
import * as sinonChai from 'sinon-chai';
import {stubInterface} from 'ts-sinon';

import InMemoryAdapter from '../Adapter/InMemoryAdapter';
import Histogram from './Histogram';

use(sinonChai);

describe('src/Metric/Histogram.ts', () => {
    it('should allow the user to observe a metric', async () => {
        const adapter: any = stubInterface<InMemoryAdapter>(['updateHistogram']);
        const config       = {name: 'foo', help: 'a', labels: ['foo']};

        const histogram = new Histogram(adapter, config);
        await histogram.observe(5, ['foo']);

        expect(adapter.updateHistogram).to.have.been.calledOnceWith();
    });
});
