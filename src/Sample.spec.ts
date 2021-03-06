import {expect} from 'chai';
import 'mocha';
import Sample, {SampleInterface} from './Sample';

describe('src/Sample.ts', () => {
    it('Should take a SampleInterface init', () => {
        const goodInit: SampleInterface = {
            name:        'test',
            labelNames:  ['blue'],
            labelValues: ['1'],
            value:       1,
        };

        expect(new Sample(goodInit)).to.instanceOf(Sample);
    });
    it('Should throw an exception if there is no name', () => {
        const badInit = {value: 'test'};
        expect(() => new Sample(badInit as any)).to.throw('Name must be defined');
    });
    it('Should throw an exception if there is no value', () => {
        const badInit = {name: 'test'};
        expect(() => new Sample(badInit as any)).to.throw('Value must be defined');
    });

    it('should respond whether or not it has label names', () => {
        const trueSample = new Sample({name: 'test', value: 1, labelNames: ['foo'], labelValues: ['bar']});
        const falseSample = new Sample({name: 'test', value: 1, labelNames: [], labelValues: []});

        expect(trueSample.hasLabelNames()).to.eq(true);
        expect(falseSample.hasLabelNames()).to.eq(false);
    });
});
