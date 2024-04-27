---
summary: Setup Verrou in your application
---

# Quick setup

You can install Verrou via your favorite package manager.

:::warning
Verrou is an ESM-only package. You will also need Node.js 18 or higher.
:::

:::codegroup

```sh
// title: npm
npm i @verrou/core
```

```sh
// title: pnpm
pnpm add @verrou/core
```

```sh
// title: yarn
yarn add @verrou/core
```

:::

## Setup

Once installed, you can use Verrou in your applications with 2 different API :

### Verrou API

The Verrou API is the preferred and simplest way to use verrou. It is also the most flexible one :

```ts
import { Verrou } from '@verrou/core'
import { redisStore } from '@verrou/core/drivers/redis'
import { memoryStore } from '@verrou/core/drivers/memory'

const verrou = new Verrou({
  default: 'redis',
  stores: {
    redis: { driver: redisStore() },
    memory: { driver: memoryStore() },
  },
})
```

- Here we have defined two stores. One Redis store, and one memory-only store.
- Verrou supports named stores. This means that in a single application you can have multiple lock stores. You must define one by default. This is the one that will be used when you call methods directly from the `verrou` object like `verrou.createLock(...)`.
- To use a store other than the default one, you will need to explicitly access it via `verrou.use(storeName)`.

### LockFactory API

Alternatively, if having to keep a global variable is a hassle for you, you can use the `LockFactory` class, which lets you create locks without having to keep a global variable.

```ts
import { LockFactory } from '@verrou/core'
import { RedisStore } from '@verrou/core/drivers/redis'

const lockFactory = new LockFactory(new RedisStore())
await lockFactory.createLock('foo').run(async () => {
  // do something
})
```

As you can see, this API does not allow you to use multiple stores. But can be useful if you want to inline the instantiation of the lock factory within your function
