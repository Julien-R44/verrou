<p align="center">
  <br/>
  <a href="https://verrou.dev/">Verrou 🔐</a> is a locking library for Node.js applications
  <br/>
</p>

## Features

- 🔐 Easy to use
- 🗄️ Multiples drivers ( Redis, Postgres, MySQL, Sqlite, In-Memory and others )
- 🚀 Modern API ( `using`, `async/await` )
- 🗂️ Named locks
- 🧪 Easily testable by switching to in-memory driver in test environment
- 📖 Well documented + handy JSDoc annotations
- 🧩 Easily extendable with your own driver

See documentation at [verrou.dev](https://verrou.dev/docs/introduction)

## Why Verrou ?

Simply because there is no alternative in the Javascript Ecosystem. Main goal of Verrou is to provide a simple and unified API to use locks, no matter the driver. It brings some benefits, like being able to switch from one driver to another without changing your code. Also being able to switch to an in-memory driver in test environment to make your tests faster and easier to write ( No infrastructure to setup ).

We also provide a modern API, using `async/await` and `using` to make your code sexy and easy to read.

## Basic usage

```ts
import { Verrou } from 'verrou'
import { redisStore } from 'verrou/drivers/redis'
import { memoryStore } from 'verrou/drivers/memory'

const lock = new Verrou({
  default: 'redis',
  drivers: {
    redis: redisStore(),
    memory: memoryStore()
  }
})

// Lock a resource
await lock.createLock('my-resource').run(async () => {
  await doSomething()
}) // Lock is automatically released after the callback
```

## Sponsor 

If you like this project, [please consider supporting it by sponsoring it](https://github.com/sponsors/Julien-R44/). It will help a lot to maintain and improve it. Thanks a lot !
