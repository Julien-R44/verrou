import { test } from '@japa/runner'
import { setTimeout } from 'node:timers/promises'

import { LockFactory } from '../src/lock_factory.js'
import { MemoryStore } from '../src/drivers/memory.js'

test.group('Lock Factory', () => {
  test('restoreLock should preserve expiration time', async ({ assert }) => {
    const store = new MemoryStore()
    const lockFactory = new LockFactory(store)

    const lock = lockFactory.createLock('foo', '1s')

    await lock.acquire()

    await setTimeout(100)

    const serializedLock = lock.serialize()
    const restoredLock = lockFactory.restoreLock(serializedLock)

    assert.closeTo(restoredLock.getRemainingTime()!, 900, 100)
    assert.deepEqual(restoredLock.getRemainingTime(), lock.getRemainingTime())
  })
})
