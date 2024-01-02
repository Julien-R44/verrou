import { test } from '@japa/runner'

import { Lock } from '../src/lock.js'
import { E_LOCK_TIMEOUT } from '../src/errors.js'
import { NullStore } from '../test_helpers/null.js'
import { MemoryStore } from '../src/drivers/memory.js'

test.group('Lock', () => {
  test('acquire', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store)

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

    const lock = new Lock('foo', new FakeStore(), { retry: { attempts: 2, delay: 10 } })

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

    const lock = new Lock('foo', new FakeStore(), { retry: { attempts: 5 } })

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
    const lock = new Lock('foo', new FakeStore(), { retry: { attempts: 5, delay: 100 } })

    // @ts-ignore
    await assert.rejects(() => lock.acquire(), E_LOCK_TIMEOUT.message)
    const elapsed = Date.now() - start
    assert.isAbove(elapsed, 400)
    assert.isBelow(elapsed, 600)
  })

  test('respect timeout when acquiring', async ({ assert }) => {
    class FakeStore extends NullStore {
      async save(_key: string) {
        return false
      }
    }

    const start = Date.now()
    const lock = new Lock('foo', new FakeStore(), { retry: { timeout: 100, delay: 10 } })

    // @ts-ignore
    await assert.rejects(() => lock.acquire(), E_LOCK_TIMEOUT.message)
    const elapsed = Date.now() - start
    assert.isAbove(elapsed, 100)
    assert.isBelow(elapsed, 200)
  })

  test('run should acquire and release lock', async ({ assert }) => {
    assert.plan(3)

    const store = new MemoryStore()
    const lock = new Lock('foo', store)

    assert.deepEqual(await lock.isLocked(), false)

    await lock.run(async () => {
      assert.deepEqual(await lock.isLocked(), true)
    })

    assert.deepEqual(await lock.isLocked(), false)
  })

  test('run should return callback result', async ({ assert }) => {
    const store = new MemoryStore()
    const lock = new Lock('foo', store)

    const result = await lock.run(async () => 'foo')

    assert.deepEqual(result, 'foo')
  })
})
