import {expect, use} from 'chai';
import 'mocha';
import * as sinonChai from 'sinon-chai';
import {stubInterface} from 'ts-sinon';

import InMemoryAdapter from '../Adapter/InMemoryAdapter';
import Histogram from './Histogram';

use(sinonChai);

const getLabels = () => [
    [['foo', 'bar'], ['a', 'b']],
    [['foo'], ['a']],
    [undefined, undefined],
];

describe('src/Metric/Histogram.ts', () => {
    it('should allow the user to observe a metric', async () => {
        for (const [labels, values] of getLabels()) {
            const adapter: any = stubInterface<InMemoryAdapter>(['updateHistogram']);
            const config       = {name: 'foo', help: 'a', labels};
            if (config.labels === undefined) {
                delete config.labels;
            }

            const histogram = new Histogram(adapter, config);
            await histogram.observe(5, values);

            expect(adapter.updateHistogram).to.have.been.calledOnceWith();
        }
    });

    it('should throw an error if configured improperly', () => {
        for (const [labels] of getLabels()) {
            const adapter: any = stubInterface<InMemoryAdapter>(['updateHistogram']);
            const config       = {name: 'foo', help: 'a', labels, buckets: []};
            if (config.labels === undefined) {
                delete config.labels;
            }

            expect(() => new Histogram(adapter, config)).to.throw('Histogram must have at least one bucket.');

            config.buckets = [3, 2, 1];
            expect(() => new Histogram(adapter, config)).to.throw('Histogram buckets must be in increasing order');

            if (config.labels) {
                config.buckets = [1, 2, 3];
                config.labels.push('le');
                expect(() => new Histogram(adapter, config)).to.throw('Histogram cannot have a label named "le".');
            }
        }
    });
});
