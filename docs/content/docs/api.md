---
summary: Verrou Locks API
---

# API

Below is the API documentation for Verrou.

## Lock API

### `acquire`

Acquire the lock. If the lock is already acquired, it will wait until it is released or the timeout is reached.

```ts
const lock = verrou.createLock('key', '10s')
await lock.acquire()
await lock.acquire({ retry: { timeout: 1000 } })
await lock.acquire({ retry: { timeout: '1s' } })
```

Accept an optional object with the following properties:

- `retry`: An object with the following properties:
  - `timeout`: The maximum time to wait for the lock to be acquired. If the timeout is reached, an `E_LOCK_TIMEOUT` error will be thrown. Defaults to `Infinity`.
  - `delay`: The delay in miliseconds between each retry. Defaults to `250`
  - `attempts`: The maximum number of attempts to acquire the lock.

### `release`

Release the lock. Note that only the lock owner can release the lock.

```ts
const lock = verrou.createLock('key')

await lock.acquire()
await lock.release()
```

### `run`

Acquire the lock, run the callback, and release the lock.

```ts
const lock = verrou.createLock('key')
await lock.run({ retry: { timeout: '1000ms' } }, async () => {
  // do something
})
```

Accept an optional object with the same properties as `acquire`.

### `tryAcquire`

Try to acquire the lock immediately. If the lock is already acquired, it will throws a `E_LOCK_ALREADY_ACQUIRED` error.

```ts
import { errors } from '@verrou/core'

const lock = verrou.createLock('key')
try {
  await lock.tryAcquire()
} catch (err) {
  if (err instanceof E_LOCK_ALREADY_ACQUIRED) {

  }
}
```

### `isLocked`

Check if the lock is acquired.

```ts
const lock = verrou.createLock('key')
const isLocked = await lock.isLocked()
```

### `getOwner`

Get the owner name of the lock. By default, the owner name is a randomly generated string.

Getting the owner is useful for [sharing the lock between multiple processes](./usage.md#sharing-a-lock-between-multiple-processes)

```ts
const lock = verrou.createLock('key')
const owner = await lock.getOwner()
```

### `isExpired`

Check if the lock is expired.

```ts
const lock = verrou.createLock('key', '10s')
const isExpired = lock.isExpired()
```

### `extend`

Extend the lock expiration time.

```ts
const lock = verrou.createLock('key', '10s')
await lock.acquire()

// extend the lock expiration time by 10 seconds
// since this is the default expiration time of the lock
await lock.extend()
// extend the lock expiration time by 20 seconds
await lock.extend('20s')
```

Argument is optional and defaults to the lock expiration time.

### `getRemainingTime`

Get the remaining time before the lock expires.

```ts
const lock = verrou.createLock('key', '10s')
await lock.acquire()

const remainingTime = lock.getRemainingTime()
```

### `forceRelease`

Force the lock to be released, no matter the owner of the lock.

```ts
const lock = verrou.createLock('key')
await lock.forceRelease()
```

## LockFactory API

### `createLock`

Create a lock.

```ts
const lock = verrou.createLock('key')
const lock = verrou.createLock('key', '5m')
const lock = verrou.createLock('key', 30_000)
```

First argument is the lock key. Second argument is optional and is the lock expiration time. By default, the lock expiration time is `30s`.

### `restoreLock`

Restore a lock. Useful when sharing a lock between multiple processes. See [Sharing a lock between multiple processes](./usage.md#sharing-a-lock-between-multiple-processes) for more details.

```ts
const lock1 = verrou.createLock('key', 'owner')
const lock2 = verrou.restoreLock(lock1.serialize())
```

### `disconnect`

Disconnect from the store if applicable. With a Redis Store, it will close the `ioredis` connection.

```ts
await verrou.disconnect()
```

## Verrou API

Verrou API is a wrapper around the LockFactory API. 

```ts
const verrou = new Verrou({
  default: 'myRedisStore',
  stores: {
    myMemoryStore: { driver: memoryStore() },
    myRedisStore: { driver: redisStore() },
    mySecondMemoryStore: { driver: memoryStore() },
    myPostgresStore: { driver: postgresStore() },
  },
})
```

Every method available on the `LockFactory` class is available on the `Verrou` class, and will be called on the default store. 

If you need to use a different store, you can use the `use` method.

```ts
// use the myRedisStore store, since it's the defined default store
verrou.createLock('key')
// use a store that is not the default store
verrou.use('myMemoryStore').createLock('key')
verrou.use('mySecondMemoryStore').createLock('key')
```

### `use`

As explained above, the `use` method allows you to use a different store than the default store.

```ts
verrou.use('myMemoryStore').createLock('key')
```

### `disconnectAll`

Disconnect from all stores.

```ts
await verrou.disconnectAll()
```

