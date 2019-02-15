# Async Node.JS Prometheus Client
[![Build Status](https://travis-ci.org/aequasi/async-prometheus-client.svg?branch=master)](https://travis-ci.org/aequasi/async-prometheus-client) [![codecov](https://codecov.io/gh/aequasi/async-prometheus-client/branch/master/graph/badge.svg)](https://codecov.io/gh/aequasi/async-prometheus-client)

This library was built to allow for asynchronous metric tracking. This mostly just means that it was built in order to 
use Redis as a registry.

The specific use case this was created for, was tracking metrics on Zeit.co's Now v2 platform, without using a PushGateway.

### How does it work?

Normally, NodeJS process are long running, and share memory. With the advent of serverless frameworks and technologies,
NodeJS apps are starting to scale across multiple processes and "servers". This can be
problematic for metric tracking and Prometheus, as you need to set it up to scrape
a particular endpoint. You might not always know what the direct endpoint is!

Some might suggest using a PushGateway, but this comes with its own list of problems to solve.

This solution was heavily inspired (pretty much a clone) from the [PHP library](https://github.com/Jimdo/prometheus_client_php).
 
### Usage

##### Create your registry:

```typescript
import {Registry, RedisAdapter} from 'async-prometheus-client'
import {createClient} from 'redis';

// By default, this will use an In Memory registry
const registry = Registry.getDefault();
// Or, a Redis one!
const registry = new Registry(new RedisAdapter(createClient()));
```

##### Create some metrics

```typescript
const counter = registry.getOrRegisterCounter({
    namespace: 'test',
    name: 'some_counter',
    help: 'it increases',
    labels: ['type'],
});
await counter.inc('blue');
await counter.incBy(3, 'green');

const gauge = registry.getOrRegisterGauge({
    namespace: 'test',
    name: 'some_gauge',
    help: 'it sets',
    labels: ['type'],
})
await gauge.set(2.5, ['blue']);
await gauge.inc(['green']);

const histogram = registry.getOrRegisterHistogram({
    namespace: 'test',
    name: 'some_histogram',
    help: 'it observers',
    labels: ['type'],
    buckets: [0.1, 1, 2, 3.5, 4, 5, 6, 7, 8, 9],
})
histogram.observe(3.5, ['blue']);
```

##### Expose the metrics

```typescript
import {Renderer} from 'async-prometheus-client';

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', Renderer.MIME_TYPE);
    
    res.send(await Renderer.render(registry));
})
```

