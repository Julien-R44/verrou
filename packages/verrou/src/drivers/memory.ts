import { Mutex, tryAcquire } from 'async-mutex'
import type { MutexInterface } from 'async-mutex'

import { E_RELEASE_NOT_OWNED } from '../errors.js'
import type { Duration, LockStore } from '../types/main.js'

/**
 * Create a new memory store
 */
export function memoryStore() {
  return { factory: () => new MemoryStore() }
}

export class MemoryStore implements LockStore {
  #releasers = new Map<string, { owner: string; release: () => void }>()
  #locks = new Map<string, MutexInterface>()

  /**
   * For a given key, get or create a new lock
   */
  getOrCreateForKey(key: string) {
    let lock = this.#locks.get(key)
    if (!lock) {
      lock = new Mutex()
      this.#locks.set(key, lock)
    }

    return lock
  }

  async extend(_key: string, _duration: Duration) {}

  async save(key: string, owner: string) {
    try {
      const mutex = this.getOrCreateForKey(key)
      const releaser = await tryAcquire(mutex).acquire()

      this.#releasers.set(key, { owner, release: releaser })
      return true
    } catch {
      return false
    }
  }

  async delete(key: string, owner: string) {
    const releaser = this.#releasers.get(key)
    if (!releaser) throw new E_RELEASE_NOT_OWNED()
    if (releaser.owner !== owner) throw new E_RELEASE_NOT_OWNED()

    releaser.release()
  }

  async exists(key: string) {
    const mutex = this.getOrCreateForKey(key)
    return mutex.isLocked()
  }

  async disconnect() {
    // noop
  }
}
