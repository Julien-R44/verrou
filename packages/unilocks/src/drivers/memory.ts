import type { MutexInterface } from 'async-mutex'
import { Mutex, withTimeout, E_TIMEOUT } from 'async-mutex'

import type { MutexLock, MutexProvider } from '../types.js'
import { E_LOCK_TIMEOUT, E_RELEASE_NOT_OWNED } from '../errors.js'

export class MemoryMutexProvider implements MutexProvider {
  #locks = new Map<string, MutexInterface>()

  /**
   * For a given key, get or create a new lock
   *
   * @param key Key to get or create a lock for
   * @param timeout Time to wait to acquire the lock
   */
  getOrCreateForKey(key: string, timeout?: number) {
    let lock = this.#locks.get(key)
    if (!lock) {
      lock = new Mutex()
      this.#locks.set(key, lock)
    }

    return timeout ? withTimeout(lock, timeout) : lock
  }

  createLock(key: string, timeout?: number) {
    const mutex = this.getOrCreateForKey(key, timeout)
    return new MemoryMutexLock(mutex, { acquireTimeout: timeout })
  }
}

export class MemoryMutexLock implements MutexLock {
  #releaser: MutexInterface.Releaser | null = null

  constructor(
    protected lock: MutexInterface,
    protected options: { acquireTimeout?: number },
  ) {}

  async acquire() {
    try {
      this.#releaser = await this.lock.acquire()
    } catch (error) {
      if (error === E_TIMEOUT) {
        throw new E_LOCK_TIMEOUT([this.options.acquireTimeout!])
      }

      throw error
    }
  }

  async release() {
    if (!this.#releaser) throw new E_RELEASE_NOT_OWNED()

    this.#releaser()
  }

  run<T>(callback: () => Promise<T>): Promise<T> {
    return this.lock.runExclusive(callback)
  }

  async isLocked() {
    return this.lock.isLocked()
  }
}
