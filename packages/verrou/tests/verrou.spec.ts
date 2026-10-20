import { test } from '@japa/runner'
import { rejects, throws } from 'node:assert/strict'

import { Verrou } from '../src/verrou.js'
import { E_SHUTDOWN } from '../src/errors.js'
import { NullStore } from '../test_helpers/null_store.js'
import { MemoryStore, memoryStore } from '../src/drivers/memory.js'

test.group('Verrou', () => {
  test('instances should be cached and re-used', ({ assert }) => {
    const verrou = new Verrou({
      default: 'memory',
      stores: {
        memory: { driver: memoryStore() },
        memory2: { driver: memoryStore() },
      },
    })

    const memory = verrou.use('memory')
    assert.deepEqual(memory, verrou.use('memory'))

    const memory2 = verrou.use('memory2')
    assert.deepEqual(memory2, verrou.use('memory2'))
  })

  test('createLock use the default store', async ({ assert }) => {
    assert.plan(1)

    class FakeStore extends NullStore {
      async save(_key: string) {
        assert.isTrue(true)
        return true
      }
    }

    const verrou = new Verrou({
      default: 'memory',
      stores: {
        memory: { driver: { factory: () => new FakeStore() } },
      },
    })

    const lock = verrou.createLock('foo')
    await lock.acquire()
  })

  test('assign custom logger', async ({ assert }) => {
    const logger = {
      loggedMessages: [] as any,
      child: () => logger,
      log: (level: string, message: any) => logger.loggedMessages.push({ level, message }),
      trace: (message: any) => logger.log('trace', message),
      debug: (...args: any[]) => logger.log('debug', args),
    }

    const verrou = new Verrou({
      default: 'memory',
      logger: logger as any,
      stores: { memory: { driver: memoryStore() } },
    })

    await verrou.createLock('foo').acquire()

    assert.isAbove(logger.loggedMessages.length, 0)
  })

  test('shutdown releases locks across stores and refuses unused stores', async ({ assert }) => {
    const first = new MemoryStore()
    const second = new MemoryStore()
    const verrou = new Verrou({
      default: 'first',
      stores: {
        first: { driver: { factory: () => first } },
        second: { driver: { factory: () => second } },
        unused: { driver: { factory: () => assert.fail('Unused store initialized') } },
      },
    })
    await verrou.createLock('first', null).acquire()
    const cachedFactory = verrou.use('second')
    const cachedLock = cachedFactory.createLock('second', null)
    await cachedLock.acquireImmediately()

    const shutdown = verrou.shutdown()
    assert.strictEqual(verrou.shutdown(), shutdown)
    await rejects(() => cachedLock.acquire(), E_SHUTDOWN)
    throws(() => verrou.use('unused'), E_SHUTDOWN)
    await shutdown

    assert.isFalse(await first.exists('first'))
    assert.isFalse(await second.exists('second'))
    await rejects(() => cachedFactory.createLock('new').acquireImmediately(), E_SHUTDOWN)
    await rejects(() => verrou.createLock('new').acquire(), E_SHUTDOWN)
  })

  test('shutdown of an unused Verrou does not initialize its default store', async ({ assert }) => {
    const verrou = new Verrou({
      default: 'unused',
      stores: {
        unused: { driver: { factory: () => assert.fail('Unused store initialized') } },
      },
    })

    await verrou.shutdown()
    throws(() => verrou.createLock('new'), E_SHUTDOWN)
  })

  test('a release failure in one store does not prevent other stores from shutting down', async ({
    assert,
  }) => {
    class FailingStore extends MemoryStore {
      async delete() {
        throw new Error('Store unavailable')
      }
    }
    const failed = new FailingStore()
    const healthy = new MemoryStore()
    const verrou = new Verrou({
      default: 'failed',
      stores: {
        failed: { driver: { factory: () => failed } },
        healthy: { driver: { factory: () => healthy } },
      },
    })
    await verrou.createLock('failed', null).acquire()
    await verrou.use('healthy').createLock('healthy', null).acquire()

    await rejects(() => verrou.shutdown(), AggregateError)
    assert.isFalse(await healthy.exists('healthy'))
    assert.isTrue(await failed.exists('failed'))
  })
})
