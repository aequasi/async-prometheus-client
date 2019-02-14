import * as Adapter from './Adapter';
import * as Metrics from './Metric';

export {default as CollectorRegistry} from './Registry';
export {default as Renderer} from './Renderer';
export {default as InMemoryAdapter} from './Adapter/InMemoryAdapter';
export {default as RedisAdapter} from './Adapter/RedisAdapter';

export {
    Metrics,
    Adapter,
};
