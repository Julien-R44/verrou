import { test } from '@japa/runner'

import { Verrou } from '../src/verrou.js'
import { memoryStore } from '../src/drivers/memory.js'
import { NullStore } from '../test_helpers/null_store.js'

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
})
