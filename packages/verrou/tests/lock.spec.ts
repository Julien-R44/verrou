import { test } from '@japa/runner'
import { noopLogger } from 'typescript-log'
import { setTimeout } from 'node:timers/promises'

import { Lock } from '../src/lock.js'
import { E_LOCK_TIMEOUT } from '../src/errors.js'
import { MemoryStore } from '../src/drivers/memory.js'
import { NullStore } from '../test_helpers/null_store.js'

test.group('Lock', () => {
  test('acquire', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: {}, logger: noopLogger() })

    assert.deepEqual(await lock.isLocked(), false)

    await lock.acquire()

    assert.deepEqual(await lock.isLocked(), true)
  })

  test('throws timeout error when lock is not acquired in time', async ({ assert }) => {
    class FakeStore extends NullStore {
      async save(_key: string) {
        return false
      }
    }

    const lock = new Lock('foo', new FakeStore(), {
      retry: { attempts: 2, delay: 10 },
      logger: noopLogger(),
    })

    // @ts-ignore
    await assert.rejects(() => lock.acquire(), E_LOCK_TIMEOUT.message)
  })

  test('respect max attempts when acquiring', async ({ assert }) => {
    let attempts = 0
    class FakeStore extends NullStore {
      async save(_key: string) {
        attempts++
        return false
      }
    }

    const lock = new Lock('foo', new FakeStore(), {
      retry: { attempts: 5, delay: 10 },
      logger: noopLogger(),
    })

    // @ts-ignore
    await assert.rejects(() => lock.acquire(), E_LOCK_TIMEOUT.message)
    assert.deepEqual(attempts, 5)
  })

  test('respect delay between attempts when acquiring', async ({ assert }) => {
    class FakeStore extends NullStore {
      async save(_key: string) {
        return false
      }
    }

    const start = Date.now()
    const lock = new Lock('foo', new FakeStore(), {
      retry: { attempts: 5, delay: 50 },
      logger: noopLogger(),
    })

    // @ts-ignore
    await assert.rejects(() => lock.acquire(), E_LOCK_TIMEOUT.message)

    const elapsed = Date.now() - start
    assert.isAbove(elapsed, 199)
    assert.isBelow(elapsed, 300)
  })

  test('respect timeout when acquiring', async ({ assert }) => {
    class FakeStore extends NullStore {
      async save(_key: string) {
        return false
      }
    }

    const start = Date.now()
    const lock = new Lock('foo', new FakeStore(), {
      retry: { timeout: 100, delay: 10 },
      logger: noopLogger(),
    })

    // @ts-ignore
    await assert.rejects(() => lock.acquire(), E_LOCK_TIMEOUT.message)
    const elapsed = Date.now() - start
    assert.isAbove(elapsed, 100)
    assert.isBelow(elapsed, 200)
  })

  test('run should acquire and release lock', async ({ assert }) => {
    assert.plan(3)

    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: {}, logger: noopLogger() })

    assert.deepEqual(await lock.isLocked(), false)

    await lock.run(async () => {
      assert.deepEqual(await lock.isLocked(), true)
    })

    assert.deepEqual(await lock.isLocked(), false)
  })

  test('run should return callback result', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: {}, logger: noopLogger() })

    const result = await lock.run(async () => 'foo')

    assert.deepEqual(result, 'foo')
  })

  test('use default ttl when not specified', async ({ assert }) => {
    assert.plan(1)

    class FakeStore extends NullStore {
      async extend(_key: string, _owner: string, duration: number) {
        assert.deepEqual(duration, 1000)
      }
    }

    const lock = new Lock('foo', new FakeStore(), { retry: {}, logger: noopLogger() }, 'bar', 1000)
    await lock.extend()
  })

  test('use specific ttl when specified', async ({ assert }) => {
    assert.plan(1)

    class FakeStore extends NullStore {
      async extend(_key: string, _owner: string, duration: number) {
        assert.deepEqual(duration, 2000)
      }
    }

    const lock = new Lock('foo', new FakeStore(), { retry: {}, logger: noopLogger() }, 'bar', 1000)
    await lock.extend(2000)
  })

  test('resolve string ttl', async ({ assert }) => {
    assert.plan(1)

    class FakeStore extends NullStore {
      async extend(_key: string, _owner: string, duration: number) {
        assert.deepEqual(duration, 2000)
      }
    }

    const lock = new Lock('foo', new FakeStore(), { retry: {}, logger: noopLogger() }, 'bar', 1000)
    await lock.extend('2s')
  })

  test('isExpired is false when lock has no expiration time', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: {}, logger: noopLogger() })

    assert.deepEqual(lock.isExpired(), false)

    await lock.acquire()

    assert.deepEqual(lock.isExpired(), false)
  })

  test('isExpired is true when lock has expired', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: {}, logger: noopLogger() }, undefined, 100)

    assert.deepEqual(lock.isExpired(), false)

    await lock.acquire()

    assert.deepEqual(lock.isExpired(), false)
    await setTimeout(200)
    assert.deepEqual(lock.isExpired(), true)
  })

  test('isExpired is extended when extending the lock', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: {}, logger: noopLogger() }, undefined, 100)

    assert.deepEqual(lock.isExpired(), false)

    await lock.acquire()

    assert.deepEqual(lock.isExpired(), false)
    await lock.extend(200)
    await setTimeout(100)
    assert.deepEqual(lock.isExpired(), false)
    await setTimeout(200)
    assert.deepEqual(lock.isExpired(), true)
  })

  test('getRemainingTime returns null when lock has no expiration time', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: {}, logger: noopLogger() })

    assert.deepEqual(lock.getRemainingTime(), null)

    await lock.acquire()

    assert.deepEqual(lock.getRemainingTime(), null)
  })

  test('getRemainingTime returns remaining time when lock has expiration time', async ({
    assert,
  }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: {}, logger: noopLogger() }, undefined, 100)

    assert.deepEqual(lock.getRemainingTime(), null)

    await lock.acquire()

    assert.closeTo(lock.getRemainingTime()!, 100, 10)
    await setTimeout(200)
    assert.closeTo(lock.getRemainingTime()!, -100, 10)
  })

  test('getRemainingTime is extended when extending the lock', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: {}, logger: noopLogger() }, undefined, 100)

    assert.deepEqual(lock.getRemainingTime(), null)

    await lock.acquire()

    assert.closeTo(lock.getRemainingTime()!, 100, 10)
    await lock.extend(200)
    assert.closeTo(lock.getRemainingTime()!, 200, 10)
  })

  test('getRemainingTime doesnt get extended when extend fails', async ({ assert }) => {
    class FakeStore extends NullStore {
      async extend() {
        throw new Error('foo')
      }
    }

    const store = new FakeStore()
    const lock = new Lock('foo', store, { retry: {}, logger: noopLogger() }, undefined, 100)

    assert.deepEqual(lock.getRemainingTime(), null)

    await lock.acquire()

    assert.closeTo(lock.getRemainingTime()!, 100, 10)
    await assert.rejects(() => lock.extend(200))
    assert.closeTo(lock.getRemainingTime()!, 100, 10)
  })

  test('expiration time is null when lock is not acquired', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: { attempts: 1 }, logger: noopLogger() })
    const lock2 = new Lock('foo', store, { retry: {}, logger: noopLogger() }, undefined, 1000)

    assert.deepEqual(lock.getRemainingTime(), null)

    await lock2.acquire()
    assert.closeTo(lock2.getRemainingTime()!, 1000, 10)

    await lock.acquire().catch(() => {})
    assert.deepEqual(lock.getRemainingTime(), null)
    assert.closeTo(lock2.getRemainingTime()!, 1000, 200)
  })
})
