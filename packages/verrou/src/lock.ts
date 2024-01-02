import { setTimeout } from 'node:timers/promises'

import { E_LOCK_TIMEOUT } from './errors.js'
import type {
  LockAcquireOptions,
  LockFactoryConfig,
  LockFactoryOptions,
  LockStore,
} from './types/main.js'

export class Lock {
  #config: LockFactoryConfig
  #owner: string

  constructor(
    protected readonly key: string,
    protected readonly lockStore: LockStore,
    options: LockFactoryOptions = {},
    owner?: string,
  ) {
    this.#config = { retry: { attempts: null, delay: 250, ...options.retry } }
    this.#owner = owner ?? this.#generateOwner()
  }

  /**
   * Generate a new owner ID
   */
  #generateOwner() {
    return Math.random().toString(36).slice(2)
  }

  /**
   * Returns the owner ID
   */
  getOwner() {
    return this.#owner
  }

  /**
   * Acquire the lock
   */
  async acquire(options?: LockAcquireOptions) {
    const start = Date.now()
    let attemptsDone = 0
    const attemptsMax =
      options?.retry?.attempts ?? this.#config.retry.attempts ?? Number.POSITIVE_INFINITY

    while (attemptsDone++ < attemptsMax) {
      const result = await this.lockStore.save(this.key, this.#owner)
      if (result) break

      if (attemptsDone === attemptsMax) throw new E_LOCK_TIMEOUT()

      const elapsed = Date.now() - start
      if (this.#config.retry.timeout && elapsed > this.#config.retry.timeout) {
        throw new E_LOCK_TIMEOUT()
      }

      await setTimeout(this.#config.retry.delay ?? 250)
    }
  }

  /**
   * Release the lock
   */
  async release() {
    await this.lockStore.delete(this.key, this.#owner)
  }

  /**
   * Returns true if the lock is currently locked
   */
  async isLocked() {
    return await this.lockStore.exists(this.key)
  }

  /**
   * Acquire the lock, run the callback and release the lock automatically
   * after the callback is done.
   * Also returns the callback return value
   */
  async run<T>(callback: () => Promise<T>): Promise<T> {
    try {
      await this.acquire()
      return await callback()
    } finally {
      await this.release()
    }
  }
}
