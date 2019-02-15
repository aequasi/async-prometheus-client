import {expect, use} from 'chai';
import 'mocha';
import {createClient} from 'redis';
import * as sinonChai from 'sinon-chai';

import {Counter, Gauge, Histogram} from '../Metric';
import RedisAdapter from './RedisAdapter';

use(sinonChai);

describe('src/Adapter/RedisAdapter.ts', () => {
    const client = createClient(process.env.REDIS_DSN);
    const adapter = new RedisAdapter(client);
    beforeEach(() => client.flushall());
    after(() => client.quit());

    it('should allow you to collect metrics', async () => {
        expect(await adapter.collect()).to.have.length(0);
    });

    it('should allow you to update a counter', async () => {
        expect(await adapter.collect()).to.have.length(0);

        const counter = new Counter(adapter, {name: 'test_counter', help: 'Test Counter', labels: ['foo']});
        await counter.inc(['bar']);

        let collection = await adapter.collect();

        expect(collection).to.have.length(1);
        expect(collection[0].name).to.eq(counter.name);
        expect(collection[0].type).to.eq(counter.getType());
        expect(collection[0].help).to.eq(counter.help);
        expect(collection[0].samples).to.have.length(1);
        expect(collection[0].samples[0].labelValues).to.have.length(1);
        expect(collection[0].samples[0].labelValues[0]).to.eq('bar');
        expect(collection[0].samples[0].labelNames).to.have.length(0);
        expect(collection[0].samples[0].name).to.eq(counter.name);
        expect(collection[0].samples[0].value).to.eq(1);

        await counter.incBy(5, ['bar']);
        await counter.inc(['baz']);
        collection = await adapter.collect();

        expect(collection[0].samples).to.have.length(2);
        expect(collection[0].samples[0].value).to.eq(6);
        expect(collection[0].samples[1].labelValues[0]).to.eq('baz');
        expect(collection[0].samples[1].value).to.eq(1);
    });

    it('should allow you to update a gauge', async () => {
        expect(await adapter.collect()).to.have.length(0);

        const gauge = new Gauge(adapter, {name: 'test_gauge', help: 'Test Gauge', labels: ['foo']});
        await gauge.set(5, ['bar']);

        let collection = await adapter.collect();

        expect(collection).to.have.length(1);
        expect(collection[0].name).to.eq(gauge.name);
        expect(collection[0].type).to.eq(gauge.getType());
        expect(collection[0].help).to.eq(gauge.help);
        expect(collection[0].samples).to.have.length(1);
        expect(collection[0].samples[0].labelValues).to.have.length(1);
        expect(collection[0].samples[0].labelValues[0]).to.eq('bar');
        expect(collection[0].samples[0].labelNames).to.have.length(0);
        expect(collection[0].samples[0].name).to.eq(gauge.name);
        expect(collection[0].samples[0].value).to.eq(5);

        await gauge.dec(['bar']);
        await gauge.inc(['baz']);
        collection = await adapter.collect();

        expect(collection[0].samples).to.have.length(2);
        expect(collection[0].samples[0].value).to.eq(4);
        expect(collection[0].samples[1].labelValues[0]).to.eq('baz');
        expect(collection[0].samples[1].value).to.eq(1);
    });

    it('should allow you to update a histogram', async () => {
        expect(await adapter.collect()).to.have.length(0);

        const histogram = new Histogram(
            adapter,
            {name: 'test_histogram', help: 'Test Histogram', labels: ['foo'], buckets: [1, 2, 4, 6, 8]},
        );
        await histogram.observe(0.5, ['bar']);
        await histogram.observe(5, ['bar']);

        let collection = await adapter.collect();
        let actualBucketLength = histogram.buckets.length + 3;

        expect(collection).to.have.length(1);
        expect(collection[0].name).to.eq(histogram.name);
        expect(collection[0].type).to.eq(histogram.getType());
        expect(collection[0].help).to.eq(histogram.help);
        expect(collection[0].samples).to.have.length(actualBucketLength);
        expect(collection[0].samples[0].labelValues).to.have.length(2);
        expect(collection[0].samples[0].labelValues[0]).to.eq('bar');
        expect(collection[0].samples[0].labelValues[1]).to.eq(histogram.buckets[0]);
        expect(collection[0].samples[0].labelNames).to.have.length(1);
        expect(collection[0].samples[0].labelNames[0]).to.eq('le');
        expect(collection[0].samples[0].name).to.eq(histogram.name + '_bucket');
        expect(collection[0].samples[actualBucketLength - 2].name).to.eq(histogram.name + '_count');
        expect(collection[0].samples[actualBucketLength - 1].name).to.eq(histogram.name + '_sum');
        expect(collection[0].samples[0].value).to.eq(1);
        expect(collection[0].samples[1].value).to.eq(1);
        expect(collection[0].samples[2].value).to.eq(1);
        expect(collection[0].samples[3].value).to.eq(2);
        expect(collection[0].samples[4].value).to.eq(2);
        expect(collection[0].samples[5].value).to.eq(2);
        expect(collection[0].samples[6].value).to.eq(2);
        expect(collection[0].samples[7].value).to.eq(5.5);

        await histogram.observe(10, ['bar']);
        await histogram.observe(7, ['bar']);
        await histogram.observe(8, ['bar']);
        await histogram.observe(1, ['baz']);
        collection = await adapter.collect();
        actualBucketLength = (histogram.buckets.length + 3) * 2;

        expect(collection[0].samples).to.have.length(actualBucketLength);
        expect(collection[0].samples[0].value).to.eq(1);
        expect(collection[0].samples[1].value).to.eq(1);
        expect(collection[0].samples[2].value).to.eq(1);
        expect(collection[0].samples[3].value).to.eq(2);
        expect(collection[0].samples[4].value).to.eq(4);
        expect(collection[0].samples[5].value).to.eq(5);
        expect(collection[0].samples[6].value).to.eq(5);
        expect(collection[0].samples[7].value).to.eq(30.5);

        expect(collection[0].samples[8].labelValues[0]).to.eq('baz');
        expect(collection[0].samples[8].value).to.eq(1);
        expect(collection[0].samples[9].value).to.eq(1);
        expect(collection[0].samples[10].value).to.eq(1);
        expect(collection[0].samples[11].value).to.eq(1);
        expect(collection[0].samples[12].value).to.eq(1);
        expect(collection[0].samples[13].value).to.eq(1);
        expect(collection[0].samples[14].value).to.eq(1);
    });

    it('should allow you to flush', async () => {
        expect(await adapter.collect()).to.have.length(0);

        const counter = new Counter(adapter, {name: 'test_counter', help: 'Test Counter', labels: ['foo']});
        await counter.inc(['bar']);

        expect(await adapter.collect()).to.have.length(1);
        await adapter.flush();

        expect(await adapter.collect()).to.have.length(0);
    });
});
