import {expect} from 'chai';
import 'mocha';
import MetricFamilySamples, {MetricFamilySamplesInterface} from './MetricFamilySamples';

describe('src/MetricFamilySample.ts', () => {
    it('Should take a MetricFamilySamplesInterface init', () => {
        const goodInit: MetricFamilySamplesInterface = {
            name:       'test',
            type:       'counter',
            help:       'Test Help',
            labelNames: ['blue'],
        };

        expect(new MetricFamilySamples(goodInit)).to.instanceOf(MetricFamilySamples);
    });
    it('Should throw an exception if there is no name', () => {
        expect(() => new MetricFamilySamples({type: 'foo', help: 'bar'} as any)).to.throw('Name must be defined');
    });
    it('Should throw an exception if there is no type', () => {
        expect(() => new MetricFamilySamples({name: 'foo', help: 'bar'} as any)).to.throw('Type must be defined');
    });
    it('Should throw an exception if there is no help', () => {
        expect(() => new MetricFamilySamples({name: 'foo', type: 'bar'} as any)).to.throw('Help must be defined');
    });

    it('should respond whether or not it has label names', () => {
        const trueMetricFamilySample  = new MetricFamilySamples({
            name:       'test',
            type:       'counter',
            help:       'help',
            labelNames: ['foo'],
        });
        const falseMetricFamilySample = new MetricFamilySamples({
            name:       'test',
            type:       'counter',
            help:       'help',
            labelNames: [],
        });

        expect(trueMetricFamilySample.hasLabelNames()).to.eq(true);
        expect(falseMetricFamilySample.hasLabelNames()).to.eq(false);
    });
});
