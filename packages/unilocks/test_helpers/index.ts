import type { Group } from '@japa/runner/core'
import type { test as JapaTest } from '@japa/runner'

import type { MutexProvider } from '../src/index.js'

export const BASE_URL = new URL('./tmp/', import.meta.url)

export const REDIS_CREDENTIALS = {
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT),
}

export function registerDriverTestSuite<T extends { new (options: any): MutexProvider }>(options: {
  test: typeof JapaTest
  mutexProvider: T
  config: ConstructorParameters<T>[0]

  /**
   * Name of the driver
   */
  name?: string

  configureGroup?: (group: Group) => any
}) {
  const { test, mutexProvider, config, name } = options

  test.group(`Mutex Provider Compliance - ${name}`, (group) => {
    options.configureGroup?.(group)

    test('acquiring lock is exclusive', async ({ assert }) => {
      const provider = new mutexProvider(config)
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
      const provider = new mutexProvider(config)
      const lock = provider.createLock('foo')

      assert.isFalse(await lock.isLocked())
    })

    test('acquiring lock makes it locked', async ({ assert }) => {
      const provider = new mutexProvider(config)
      const lock = provider.createLock('foo')

      await lock.acquire()

      assert.isTrue(await lock.isLocked())
    })

    test('creating same lock twice returns same lock', async ({ assert }) => {
      const provider = new mutexProvider(config)
      const lock1 = provider.createLock('foo1')
      const lock2 = provider.createLock('foo1')

      assert.deepEqual(!(await lock1.isLocked()), !(await lock2.isLocked()))

      await lock1.acquire()

      assert.deepEqual(await lock1.isLocked(), await lock2.isLocked())
    })

    test('cant release a lock that is not acquired by you', async () => {
      const provider = new mutexProvider(config)
      const lock = provider.createLock('foo')
      const lock2 = provider.createLock('foo')

      await lock.acquire()

      await lock2.release()
    }).throws(/It looks like you are trying to release a lock that is not acquired by you/)

    test('throws timeout error when lock is not acquired in time', async () => {
      const provider = new mutexProvider(config)
      const lock = provider.createLock('foo', 100)

      await lock.acquire()

      await lock.acquire()
    }).throws('Lock was not acquired in the given timeout ( 100 ms )')
  })
}
