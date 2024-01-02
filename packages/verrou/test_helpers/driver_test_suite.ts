import type { Group } from '@japa/runner/core'
import type { test as JapaTest } from '@japa/runner'
import { setTimeout as sleep } from 'node:timers/promises'

import { E_LOCK_TIMEOUT } from '../index.js'
import { LockFactory } from '../src/lock_factory.js'
import type { LockStore } from '../src/types/main.js'

export function registerStoreTestSuite<T extends { new (options: any): LockStore }>(options: {
  test: typeof JapaTest
  store: T
  config: ConstructorParameters<T>[0]
  configureGroup?: (group: Group) => any
}) {
  const { test, store, config } = options

  test('acquiring lock is exclusive', async ({ assert }) => {
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')

    await lock.acquire()

    let wasReleased = false
    setTimeout(async () => {
      await lock.release()
      wasReleased = true
    }, 50)

    assert.isFalse(wasReleased)

    await lock.acquire()

    assert.isTrue(wasReleased)
  })

  test('new mutex is not locked', async ({ assert }) => {
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')

    assert.isFalse(await lock.isLocked())
  })

  test('acquiring lock makes it locked', async ({ assert }) => {
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')

    await lock.acquire()

    assert.isTrue(await lock.isLocked())
  })

  test('creating same lock twice returns same lock', async ({ assert }) => {
    const provider = new LockFactory(new store(config))
    const lock1 = provider.createLock('foo1')
    const lock2 = provider.createLock('foo1')

    assert.deepEqual(!(await lock1.isLocked()), !(await lock2.isLocked()))

    await lock1.acquire()

    assert.deepEqual(await lock1.isLocked(), await lock2.isLocked())
  })

  test('cant release a lock that is not acquired by you', async () => {
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')
    const lock2 = provider.createLock('foo')

    await lock.acquire()

    await lock2.release()
  }).throws(/It looks like you are trying to release a lock that is not acquired by you/)

  test('throws timeout error when lock is not acquired in time', async () => {
    const provider = new LockFactory(new store(config), {
      retry: { timeout: 500 },
    })
    const lock = provider.createLock('foo')

    await lock.acquire()

    await lock.acquire()
    // @ts-expect-error poppinss/utils typing bug
  }).throws(E_LOCK_TIMEOUT.message, E_LOCK_TIMEOUT)

  test('run passes result', async ({ assert }) => {
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')

    const result = await lock.run(async () => 'hello world')

    assert.equal(result, 'hello world')
  })

  test('run passes result from a promise', async ({ assert }) => {
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')

    const result = await lock.run(async () => Promise.resolve('hello world'))

    assert.equal(result, 'hello world')
  })

  test('run passes rejection', async ({ assert }) => {
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')

    await assert.rejects(
      async () =>
        lock.run(async () => {
          return Promise.reject(new Error('hello world'))
        }),
      'hello world',
    )
  })

  test('run passes exceptions', async ({ assert }) => {
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')

    await assert.rejects(async () => {
      return await lock.run(() => {
        throw new Error('hello world')
      })
    }, 'hello world')
  })

  test('run is exclusive', async ({ assert }) => {
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')

    let flag = false
    lock.run(async () => {
      await sleep(500)
      flag = true
    })

    assert.isFalse(flag)

    const result = await lock.run(async () => {
      assert.isTrue(flag)
      return '42'
    })

    assert.isTrue(flag)
    assert.equal(result, '42')
  })

  test('exceptions during run do not leave mutex in locked state', async ({ assert }) => {
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')
    let flag = false

    lock
      .run(async () => {
        flag = true
        throw new Error('hello world')
      })
      .catch(() => undefined)

    assert.isFalse(flag)
    await lock.run(async () => undefined)
    assert.isTrue(flag)
  })

  test('multiple calls to release behave as expected', async ({ assert }) => {
    let v = 0
    const provider = new LockFactory(new store(config))
    const lock = provider.createLock('foo')

    const run = async () => {
      await lock.acquire()
      v++
      await lock.release()
    }

    await Promise.all([run(), run(), run()])
    assert.deepEqual(v, 3)
  })
}
