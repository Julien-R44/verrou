import { test } from '@japa/runner'
import { noopLogger } from 'typescript-log'
import { setTimeout } from 'node:timers/promises'

import { Lock } from '../src/lock.js'
import { MemoryStore } from '../src/drivers/memory.js'
import { NullStore } from '../test_helpers/null_store.js'

const defaultOptions = {
  retry: {
    attempts: Number.POSITIVE_INFINITY,
    delay: 10,
    timeout: undefined,
  },
  logger: noopLogger(),
}

test.group('Lock', () => {
  test('acquire', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)

    assert.deepEqual(await lock.isLocked(), false)

    await lock.acquire()

    assert.deepEqual(await lock.isLocked(), true)
  })

  test('return false when not acquired in time', async ({ assert }) => {
    class FakeStore extends NullStore {
      async save(_key: string) {
        return false
      }
    }

    const lock = new Lock('foo', new FakeStore(), {
      retry: { attempts: 2, delay: 10 },
      logger: noopLogger(),
    })

    const handle = await lock.acquire()
    assert.deepEqual(handle, false)
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

    const handle = await lock.acquire()
    assert.deepEqual(handle, false)
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

    const handle = await lock.acquire()

    assert.deepEqual(handle, false)
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
      retry: { timeout: 100, delay: 10, attempts: Number.POSITIVE_INFINITY },
      logger: noopLogger(),
    })

    const handle = await lock.acquire()
    assert.deepEqual(handle, false)
    const elapsed = Date.now() - start
    assert.isAbove(elapsed, 100)
    assert.isBelow(elapsed, 200)
  })

  test('use default ttl when not specified', async ({ assert }) => {
    assert.plan(1)

    class FakeStore extends NullStore {
      async extend(_key: string, _owner: string, duration: number) {
        assert.deepEqual(duration, 1000)
      }
    }

    const lock = new Lock('foo', new FakeStore(), defaultOptions, 'bar', 1000)
    await lock.extend()
  })

  test('use specific ttl when specified', async ({ assert }) => {
    assert.plan(1)

    class FakeStore extends NullStore {
      async extend(_key: string, _owner: string, duration: number) {
        assert.deepEqual(duration, 2000)
      }
    }

    const lock = new Lock('foo', new FakeStore(), defaultOptions, 'bar', 1000)
    await lock.extend(2000)
  })

  test('resolve string ttl', async ({ assert }) => {
    assert.plan(1)

    class FakeStore extends NullStore {
      async extend(_key: string, _owner: string, duration: number) {
        assert.deepEqual(duration, 2000)
      }
    }

    const lock = new Lock('foo', new FakeStore(), defaultOptions, 'bar', 1000)
    await lock.extend('2s')
  })

  test('isExpired is false when lock has no expiration time', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)

    assert.deepEqual(lock.isExpired(), false)

    await lock.acquire()

    assert.deepEqual(lock.isExpired(), false)
  })

  test('isExpired is true when lock has expired', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions, undefined, 100)

    assert.deepEqual(lock.isExpired(), false)

    await lock.acquire()

    assert.deepEqual(lock.isExpired(), false)
    await setTimeout(200)
    assert.deepEqual(lock.isExpired(), true)
  })

  test('isExpired is extended when extending the lock', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions, undefined, 100)

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
    const lock = new Lock('foo', store, defaultOptions)

    assert.deepEqual(lock.getRemainingTime(), null)

    await lock.acquire()

    assert.deepEqual(lock.getRemainingTime(), null)
  })

  test('getRemainingTime returns remaining time when lock has expiration time', async ({
    assert,
  }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions, undefined, 100)

    assert.deepEqual(lock.getRemainingTime(), null)

    await lock.acquire()

    assert.closeTo(lock.getRemainingTime()!, 100, 10)
    await setTimeout(200)
    assert.closeTo(lock.getRemainingTime()!, -100, 10)
  })

  test('getRemainingTime is extended when extending the lock', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions, undefined, 100)

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
    const lock = new Lock('foo', store, defaultOptions, undefined, 100)

    assert.deepEqual(lock.getRemainingTime(), null)

    await lock.acquire()

    assert.closeTo(lock.getRemainingTime()!, 100, 10)
    await assert.rejects(() => lock.extend(200))
    assert.closeTo(lock.getRemainingTime()!, 100, 10)
  })

  test('expiration time is null when lock is not acquired', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: { attempts: 1, delay: 10 }, logger: noopLogger() })
    const lock2 = new Lock('foo', store, defaultOptions, undefined, 1000)

    assert.deepEqual(lock.getRemainingTime(), null)

    await lock2.acquire()
    assert.closeTo(lock2.getRemainingTime()!, 1000, 10)

    await lock.acquire().catch(() => {})
    assert.deepEqual(lock.getRemainingTime(), null)
    assert.closeTo(lock2.getRemainingTime()!, 1000, 200)
  })

  test('acquire options.retry.delay is used', async ({ assert }) => {
    let attempts = 0
    class FakeStore extends NullStore {
      async save(_key: string) {
        attempts++
        if (attempts >= 2) return false
        return true
      }
    }

    const store = new FakeStore()
    const lock = new Lock('foo', store, {
      retry: { attempts: 2, delay: 400 },
      logger: noopLogger(),
    })

    const lock2 = new Lock('foo', store, {
      retry: { attempts: 2, delay: 100 },
      logger: noopLogger(),
    })

    await lock2.acquire()

    assert.deepEqual(await lock.acquire({ retry: { attempts: 1 } }), false)
    assert.deepEqual(attempts, 2)

    assert.deepEqual(await lock.acquire({ retry: { attempts: 3 } }), false)
    assert.deepEqual(attempts, 5)
  })

  test('acquire return true if acquired', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)

    assert.deepEqual(await lock.acquire(), true)
  })

  test('acquire options.timeout is used', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, {
      retry: { attempts: Number.POSITIVE_INFINITY, delay: 400, timeout: 200 },
      logger: noopLogger(),
    })
    const lock2 = new Lock('foo', store, {
      retry: { attempts: Number.POSITIVE_INFINITY, delay: 400, timeout: 100 },
      logger: noopLogger(),
    })

    await lock2.acquire()
    const handle = lock.acquire({
      retry: { attempts: Number.POSITIVE_INFINITY, timeout: 500 },
    })

    const start = Date.now()
    assert.deepEqual(await handle, false)
    const elapsed = Date.now() - start
    assert.isAbove(elapsed, 500)
  })

  test('acquireImmediately returns true if lock is acquired', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)

    assert.deepEqual(await lock.isLocked(), false)

    const result = await lock.acquireImmediately()

    assert.deepEqual(result, true)
    assert.deepEqual(await lock.isLocked(), true)
  })

  test('acquireImmediately works', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions, undefined, 1000)

    assert.deepEqual(await lock.isLocked(), false)

    const result = await lock.acquireImmediately()

    assert.deepEqual(result, true)
    assert.deepEqual(await lock.isLocked(), true)
    assert.deepEqual(lock.getRemainingTime(), 1000)
    assert.deepEqual(lock.isExpired(), false)
  })

  test('acquireImmediately returns false when lock is not available', async ({ assert }) => {
    class FakeStore extends NullStore {
      async save(_key: string) {
        return false
      }
    }

    const lock = new Lock('foo', new FakeStore(), defaultOptions)

    assert.deepEqual(await lock.acquireImmediately(), false)
  })
})

test.group('Lock - run methods', () => {
  test('runImmediately return false if not executed', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)
    const lock2 = new Lock('foo', store, defaultOptions)

    await lock2.acquire()

    const result = await lock.runImmediately(async () => 'foo')
    assert.deepEqual(result, [false, null])
  })

  test('runImmediately returns true and callback result', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)

    const result = await lock.runImmediately(async () => 'foo')

    assert.deepEqual(result, [true, 'foo'])
  })

  test('runImmediately should acquire and release lock', async ({ assert }) => {
    assert.plan(3)

    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)

    assert.deepEqual(await lock.isLocked(), false)

    await lock.runImmediately(async () => {
      assert.deepEqual(await lock.isLocked(), true)
    })

    assert.deepEqual(await lock.isLocked(), false)
  })

  test('run should acquire and release lock', async ({ assert }) => {
    assert.plan(3)

    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)

    assert.deepEqual(await lock.isLocked(), false)

    await lock.run(async () => {
      assert.deepEqual(await lock.isLocked(), true)
    })

    assert.deepEqual(await lock.isLocked(), false)
  })

  test('run should return callback result', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)

    const [, result] = await lock.run(async () => 'foo')

    assert.deepEqual(result, 'foo')
  })

  test('run should return false if lock is not acquired', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, { retry: { attempts: 1, delay: 10 }, logger: noopLogger() })
    const lock2 = new Lock('foo', store, defaultOptions)

    await lock2.acquire()
    const result = await lock.run(async () => 'foo')

    assert.deepEqual(result, [false, null])
  })

  test('run should returns correct union type', async ({ expectTypeOf }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)

    const result = await lock.run(async () => 'foo')

    expectTypeOf(result).toEqualTypeOf<[true, string] | [false, null]>()
    if (result[0]) {
      expectTypeOf(result).toEqualTypeOf<[true, string]>()
    }
  })

  test('runImmediately should returns correct union type', async ({ expectTypeOf }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store, defaultOptions)

    const result = await lock.runImmediately(async () => 'foo')

    expectTypeOf(result).toEqualTypeOf<[true, string] | [false, null]>()
    if (result[0]) {
      expectTypeOf(result).toEqualTypeOf<[true, string]>()
    }
  })
})
