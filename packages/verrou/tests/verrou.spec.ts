import { test } from '@japa/runner'

import { Verrou } from '../src/verrou.js'
import { NullStore } from '../test_helpers/null.js'
import { memoryStore } from '../src/drivers/memory.js'

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
})
