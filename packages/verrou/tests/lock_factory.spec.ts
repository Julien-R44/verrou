import { test } from '@japa/runner'
import { rejects } from 'node:assert/strict'
import { setTimeout } from 'node:timers/promises'

import { LockFactory } from '../src/lock_factory.js'
import { MemoryStore } from '../src/drivers/memory.js'
import { E_SHUTDOWN, E_LOCK_NOT_OWNED } from '../src/errors.js'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

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

  test('can pass string as duration', async () => {
    const store = new MemoryStore()
    const lockFactory = new LockFactory(store, {
      retry: { attempts: 10, delay: '1s', timeout: '10s' },
    })

    lockFactory.createLock('foo', '1s')
  })
})

test.group('Lock Factory - shutdown', () => {
  test('releases held locks without a TTL and leaves other factories alone', async ({ assert }) => {
    const store = new MemoryStore()
    const factory = new LockFactory(store)
    const otherFactory = new LockFactory(store)
    await factory.createLock('permanent', null).acquire()
    await factory.createLock('temporary', '1m').acquireImmediately()
    await otherFactory.createLock('other', null).acquire()

    const shutdown = factory.shutdown()
    assert.strictEqual(factory.shutdown({ timeout: 0 }), shutdown)
    await shutdown

    assert.isFalse(await store.exists('permanent'))
    assert.isFalse(await store.exists('temporary'))
    assert.isTrue(await store.exists('other'))
    assert.isTrue(await otherFactory.createLock('permanent', null).acquireImmediately())
    await otherFactory.shutdown()
  })

  test('refuses acquisitions through existing, new, and restored handles', async ({ assert }) => {
    const factory = new LockFactory(new MemoryStore())
    const existing = factory.createLock('existing')
    const shutdown = factory.shutdown()
    const handles = [existing, factory.createLock('new'), factory.restoreLock(existing.serialize())]

    for (const lock of handles) {
      await rejects(() => lock.acquire(), E_SHUTDOWN)
      await rejects(() => lock.acquireImmediately(), E_SHUTDOWN)
      await rejects(() => lock.run(async () => assert.fail('Callback ran')), E_SHUTDOWN)
      await rejects(() => lock.runImmediately(async () => assert.fail('Callback ran')), E_SHUTDOWN)
    }
    await shutdown
  })

  for (const method of ['run', 'runImmediately'] as const) {
    test(`waits for ${method} callbacks and preserves their results`, async ({ assert }) => {
      const store = new MemoryStore()
      const factory = new LockFactory(store)
      const started = deferred()
      const finish = deferred()
      const running = factory.createLock('running', null)[method](async () => {
        started.resolve()
        await finish.promise
        return 42
      })
      await started.promise

      let stopped = false
      const shutdown = factory.shutdown({ timeout: null }).then(() => {
        stopped = true
      })
      await setTimeout(10)
      assert.isFalse(stopped)
      assert.isTrue(await store.exists('running'))

      finish.resolve()
      assert.deepEqual(await running, [true, 42])
      await shutdown
      assert.isFalse(await store.exists('running'))
    })

    test(`releases ${method} locks after the grace period without cancelling callbacks`, async ({
      assert,
    }) => {
      const store = new MemoryStore()
      const factory = new LockFactory(store)
      const started = deferred()
      const finish = deferred()
      const running = factory.createLock('running', null)[method](async () => {
        started.resolve()
        await finish.promise
        return 'finished after shutdown'
      })
      await started.promise

      await factory.shutdown({ timeout: '20ms' })
      assert.isFalse(await store.exists('running'))

      const otherFactory = new LockFactory(store)
      const replacement = otherFactory.createLock('running', null)
      assert.isTrue(await replacement.acquireImmediately())
      finish.resolve()
      assert.deepEqual(await running, [true, 'finished after shutdown'])
      assert.isTrue(await replacement.isLocked())
      await otherFactory.shutdown()
    })
  }

  test('does not wait for callbacks when timeout is zero', async ({ assert }) => {
    const store = new MemoryStore()
    const factory = new LockFactory(store)
    const started = deferred()
    const finish = deferred()
    const running = factory.createLock('running', null).run(async () => {
      started.resolve()
      await finish.promise
    })
    await started.promise
    await factory.shutdown({ timeout: 0 })
    assert.isFalse(await store.exists('running'))
    finish.resolve()
    await running
  })

  test('callback failures do not prevent shutdown', async ({ assert }) => {
    const factory = new LockFactory(new MemoryStore())
    const started = deferred()
    const finish = deferred()
    const running = factory.createLock('running', null).run(async () => {
      started.resolve()
      await finish.promise
      throw new Error('Callback failed')
    })
    const rejected = assert.rejects(() => running, 'Callback failed')
    await started.promise
    const shutdown = factory.shutdown()
    finish.resolve()
    await rejected
    await shutdown
  })

  test('cancels sleeping acquisition retries', async () => {
    const factory = new LockFactory(new MemoryStore(), { retry: { delay: '1h' } })
    await factory.createLock('busy', null).acquire()
    const waiting = factory.createLock('busy').acquire()
    const rejected = rejects(() => waiting, E_SHUTDOWN)
    await setTimeout(10)

    await factory.shutdown()
    await rejected
  }).timeout(1000)

  for (const method of ['acquire', 'acquireImmediately', 'run', 'runImmediately'] as const) {
    test(`cleans up a pending ${method} that succeeds during shutdown`, async ({ assert }) => {
      const saved = deferred()
      const resume = deferred()
      class SlowStore extends MemoryStore {
        async save(key: string, owner: string, ttl: number | null) {
          const acquired = await super.save(key, owner, ttl)
          saved.resolve()
          await resume.promise
          return acquired
        }
      }
      const store = new SlowStore()
      const factory = new LockFactory(store)
      const lock = factory.createLock('pending', null)
      const acquiring =
        method === 'acquire' || method === 'acquireImmediately'
          ? lock[method]()
          : lock[method](async () => assert.fail('Callback ran'))
      const rejected = rejects(() => acquiring, E_SHUTDOWN)
      await saved.promise

      let stopped = false
      const shutdown = factory.shutdown({ timeout: 0 }).then(() => {
        stopped = true
      })
      await setTimeout(10)
      assert.isFalse(stopped)
      resume.resolve()
      await rejected
      await shutdown
      assert.isFalse(await store.exists('pending'))
    })
  }

  test('does not release locks already released, force-released, or expired', async () => {
    class OfflineStore extends MemoryStore {
      offline = false
      async delete(key: string, owner: string) {
        if (this.offline) throw new Error('Store unavailable')
        return super.delete(key, owner)
      }
    }
    const store = new OfflineStore()
    const factory = new LockFactory(store)
    const released = factory.createLock('released', null)
    await released.acquire()
    await factory.restoreLock(released.serialize()).release()
    const forced = factory.createLock('forced', null)
    await forced.acquire()
    await forced.forceRelease()
    await factory.createLock('expired', 10).acquire()
    await setTimeout(30)

    store.offline = true
    await factory.shutdown()
  })

  test('keeps extended leases tracked beyond the original expiration', async ({ assert }) => {
    class SlowExtendStore extends MemoryStore {
      async extend(key: string, owner: string, duration: number) {
        await super.extend(key, owner, duration)
        await setTimeout(50)
      }
    }
    const store = new SlowExtendStore()
    const factory = new LockFactory(store)
    const lock = factory.createLock('extended', 30)
    await lock.acquire()
    await lock.extend('1m')

    await factory.shutdown()
    assert.isFalse(await store.exists('extended'))
  })

  test('tracks an expired lease renewed by the store', async ({ assert }) => {
    const store = new MemoryStore()
    const factory = new LockFactory(store)
    const lock = factory.createLock('renewed', 10)
    await lock.acquire()
    await setTimeout(30)
    await lock.extend('1m')

    await factory.shutdown()
    assert.isFalse(await store.exists('renewed'))
  })

  test('a delayed acquisition cannot replace tracking for a newer lease', async ({ assert }) => {
    const saved = deferred()
    const resume = deferred()
    class SlowStore extends MemoryStore {
      async save(key: string, owner: string, ttl: number | null) {
        const acquired = await super.save(key, owner, ttl)
        if (ttl !== null) {
          saved.resolve()
          await resume.promise
        }
        return acquired
      }
    }
    const store = new SlowStore()
    const factory = new LockFactory(store)
    const first = factory.createLock('shared', 10).acquireImmediately()
    await saved.promise
    await setTimeout(30)
    const second = factory.createLock('shared', null).acquireImmediately()
    await setTimeout(0)
    resume.resolve()
    assert.deepEqual(await Promise.all([first, second]), [true, true])

    await factory.shutdown()
    assert.isFalse(await store.exists('shared'))
  })

  for (const method of ['release', 'forceRelease'] as const) {
    test(`a delayed ${method} cannot untrack a reacquired lease`, async ({ assert }) => {
      const released = deferred()
      const resume = deferred()
      class SlowStore extends MemoryStore {
        async delete(key: string, owner: string) {
          await super.delete(key, owner)
          released.resolve()
          await resume.promise
        }

        async forceDelete(key: string) {
          await super.forceDelete(key)
          released.resolve()
          await resume.promise
        }
      }
      const store = new SlowStore()
      const factory = new LockFactory(store)
      const lock = factory.createLock('shared', null)
      await lock.acquire()
      const releasing = lock[method]()
      await released.promise
      const reacquiring = lock.acquireImmediately()
      await setTimeout(0)
      resume.resolve()
      await releasing
      assert.isTrue(await reacquiring)

      await factory.shutdown()
      assert.isFalse(await store.exists('shared'))
    })
  }

  test('extending a restored lease replaces stale tracking for another owner', async ({
    assert,
  }) => {
    const store = new MemoryStore()
    const factory = new LockFactory(store)
    const otherFactory = new LockFactory(store)
    const original = factory.createLock('shared', null)
    await original.acquire()
    await otherFactory.restoreLock(original.serialize()).release()
    const replacement = otherFactory.createLock('shared', null)
    await replacement.acquire()
    await factory.restoreLock(replacement.serialize()).extend('1m')

    await factory.shutdown()
    assert.isFalse(await store.exists('shared'))
    await otherFactory.shutdown()
  })

  test('preserves a restored release queued before shutdown', async ({ assert }) => {
    const checked = deferred()
    const resume = deferred()
    class SlowStore extends MemoryStore {
      async save(key: string, owner: string, ttl: number | null) {
        const acquired = await super.save(key, owner, ttl)
        if (!acquired) {
          checked.resolve()
          await resume.promise
        }
        return acquired
      }
    }
    const store = new SlowStore()
    const factory = new LockFactory(store)
    const otherFactory = new LockFactory(store)
    const held = otherFactory.createLock('shared', null)
    await held.acquire()
    const acquiring = factory.createLock('shared', null).acquireImmediately()
    const rejected = rejects(() => acquiring, E_SHUTDOWN)
    await checked.promise
    const releasing = factory.restoreLock(held.serialize()).release()
    const shutdown = factory.shutdown()
    resume.resolve()

    await rejected
    await releasing
    await shutdown
    assert.isFalse(await store.exists('shared'))
    await otherFactory.shutdown()
  })

  test('reports release failures after attempting the other locks', async ({ assert }) => {
    const failure = new Error('Store unavailable')
    class FailingStore extends MemoryStore {
      offline = true
      async delete(key: string, owner: string) {
        if (key === 'failed' && this.offline) throw failure
        return super.delete(key, owner)
      }
    }
    const store = new FailingStore()
    const factory = new LockFactory(store)
    const failed = factory.createLock('failed', null)
    await failed.acquire()
    await factory.createLock('released', null).acquire()

    try {
      await factory.shutdown()
      assert.fail('Shutdown should report the failure')
    } catch (error) {
      assert.instanceOf(error, AggregateError)
      assert.deepEqual((error as AggregateError).errors, [failure])
    }
    assert.isFalse(await store.exists('released'))
    assert.isTrue(await store.exists('failed'))
    await rejects(() => factory.createLock('new').acquire(), E_SHUTDOWN)

    store.offline = false
    await failed.release()
    assert.isFalse(await store.exists('failed'))
  })

  test('ignores ownership loss when cleaning up a held lock', async () => {
    class LostOwnershipStore extends MemoryStore {
      async delete() {
        throw new E_LOCK_NOT_OWNED()
      }
    }
    const factory = new LockFactory(new LostOwnershipStore())
    await factory.createLock('lost', null).acquire()
    await factory.shutdown()
  })
})
