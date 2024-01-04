import { Mutex, tryAcquire } from 'async-mutex'
import type { MutexInterface } from 'async-mutex'

import { E_LOCK_NOT_OWNED } from '../errors.js'
import type { LockStore } from '../types/main.js'

type MemoryLockEntry = {
  mutex: MutexInterface
  releaser?: () => void
  owner: string
  expiresAt?: number
}

/**
 * Create a new memory store
 */
export function memoryStore() {
  return { factory: () => new MemoryStore() }
}

export class MemoryStore implements LockStore {
  #locks = new Map<string, MemoryLockEntry>()

  /**
   * For a given key, get or create a new lock
   */
  getOrCreateForKey(key: string, owner: string) {
    let lock = this.#locks.get(key)
    if (!lock) {
      lock = { mutex: new Mutex(), owner }
      this.#locks.set(key, lock)
    }

    return lock
  }

  /**
   * Compute the expiration date of a lock
   */
  #computeExpiresAt(ttl: number | null) {
    return ttl ? Date.now() + ttl : Number.POSITIVE_INFINITY
  }

  /**
   * Check if lock is expired
   */
  #isLockEntryExpired(lock: MemoryLockEntry) {
    return lock.expiresAt && lock.expiresAt < Date.now()
  }

  /**
   * Extend a lock
   */
  async extend(key: string, owner: string, duration: number) {
    const lock = this.#locks.get(key)
    if (!lock || lock.owner !== owner) throw new E_LOCK_NOT_OWNED()

    lock.expiresAt = this.#computeExpiresAt(duration)
  }

  /**
   * Save a lock
   */
  async save(key: string, owner: string, ttl: number | null) {
    try {
      const lock = this.getOrCreateForKey(key, owner)

      if (this.#isLockEntryExpired(lock)) lock.releaser?.()

      lock.releaser = await tryAcquire(lock.mutex).acquire()
      lock.expiresAt = this.#computeExpiresAt(ttl)

      return true
    } catch {
      return false
    }
  }

  /**
   * Delete a lock
   */
  async delete(key: string, owner: string) {
    const mutex = this.#locks.get(key)

    if (!mutex || !mutex.releaser) throw new E_LOCK_NOT_OWNED()
    if (mutex.owner !== owner) throw new E_LOCK_NOT_OWNED()

    mutex.releaser()
  }

  /**
   * Force delete a lock
   */
  async forceRelease(key: string) {
    const lock = this.#locks.get(key)
    if (!lock) return

    lock.releaser?.()
  }

  /**
   * Check if a lock exists
   */
  async exists(key: string) {
    const lock = this.#locks.get(key)
    if (!lock || this.#isLockEntryExpired(lock)) return false

    return lock.mutex.isLocked()
  }

  async disconnect() {
    // noop
  }
}
