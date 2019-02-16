import {expect, use} from 'chai';
import {createHash} from 'crypto';
import * as sinonChai from 'sinon-chai';
import {stubInterface} from 'ts-sinon';

import 'mocha';

import InMemoryAdapter from '../Adapter/InMemoryAdapter';
import Counter from './Counter';

use(sinonChai);

const sha = createHash('sha1');

describe('src/Metric/Abstract.ts', () => {
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

    it('should create a key properly', () => {
        const adapter = stubInterface<InMemoryAdapter>();
        const config  = {name: 'foo', help: 'a', labels: ['foo', 'bar']};
        const counter = new Counter(adapter, config);

        const hash = sha.update((counter.metricName + JSON.stringify(config.labels))).digest('hex');

        expect(counter.getKey()).to.eq(hash);
    });

    it('should throw an error if labels dont match', () => {
        const adapter = stubInterface<InMemoryAdapter>();
        const config = {name: 'foo', help: 'a', labels: ['foo']};
        const counter = new Counter(adapter, config);
        expect(() => counter.inc(['a', 'b'])).to.throw('Labels are not defined correctly: ');
    });
});
