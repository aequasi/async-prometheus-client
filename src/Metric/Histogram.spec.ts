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

    it('should throw an error if configured improperly', () => {
        const adapter: any = stubInterface<InMemoryAdapter>(['updateHistogram']);
        const config       = {name: 'foo', help: 'a', labels: ['foo'], buckets: []};

        expect(() => new Histogram(adapter, config)).to.throw('Histogram must have at least one bucket.');

        config.buckets = [3, 2, 1];
        expect(() => new Histogram(adapter, config)).to.throw('Histogram buckets must be in increasing order');

        config.buckets = [1, 2, 3];
        config.labels.push('le');
        expect(() => new Histogram(adapter, config)).to.throw('Histogram cannot have a label named "le".');
    });
});
