![banner](./assets/banner.png)

<p align="center">
  <br/>
  <a href="https://verrou.dev/">Verrou 🔐</a> is a locking library for Node.js applications
  <br/>
</p>

## Features

- 🔒 Easy usage
- 🔄 Multiple drivers (Redis, Postgres, MySQL, Sqlite, In-Memory and others)
- 📦 Multiple database adapters ( Knex, Kysely ...)
- 🔑 Customizable named locks
- 🌐 Consistent API across all drivers
- 🧪 Easy testing by switching to an in-memory driver
- 🔨 Easily extensible with your own drivers

See documentation at [verrou.dev](https://verrou.dev/docs/introduction)

## Why Verrou ? 

Main advantage of Verrou is that it provides a consistent API across all drivers. This means that you can switch from one driver to another without having to change your code. It also means you can switch to an in-memory in your test environment, making tests faster and easier to setup (no infrastructure or anything fancy to setup).

Having a consistent API also means that you don't have to learn a new API when switching from one driver to another. Today, in the node ecosystem, we have different npm packages to manage locks, but they all have differents APIs and behaviors.

But having a consistent API doesn't mean having a less powerful API. Verrou provides every features you would expect from a locking library, and even more.

## Basic usage

```ts
import { Verrou } from '@verrou/core'
import { redisStore } from '@verrou/core/drivers/redis'
import { memoryStore } from '@verrou/core/drivers/memory'

const verrou = new Verrou({
  default: 'redis',
  drivers: {
    redis: { driver: redisStore() },
    memory: { driver: memoryStore() }
  }
})

// Lock a resource and run a function
await verrou.createLock('my-resource').run(async () => {
  await doSomething()
}) // Lock is automatically released
```

## Sponsor 

If you like this project, [please consider supporting it by sponsoring it](https://github.com/sponsors/Julien-R44/). It will help a lot to maintain and improve it. Thanks a lot !
