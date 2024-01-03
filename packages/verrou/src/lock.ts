import { setTimeout } from 'node:timers/promises'

import { E_LOCK_TIMEOUT } from './errors.js'
import type { LockAcquireOptions, LockFactoryConfig, LockStore } from './types/main.js'

export class Lock {
  #owner: string

  constructor(
    protected readonly key: string,
    protected readonly lockStore: LockStore,
    protected config: LockFactoryConfig,
    owner?: string,
    protected ttl?: number | null,
  ) {
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
    let attemptsDone = 0
    const start = Date.now()
    const attemptsMax =
      options?.retry?.attempts ?? this.config.retry.attempts ?? Number.POSITIVE_INFINITY

    while (attemptsDone++ < attemptsMax) {
      const result = await this.lockStore.save(this.key, this.#owner, this.ttl)
      if (result) break

      if (attemptsDone === attemptsMax) throw new E_LOCK_TIMEOUT()

      const elapsed = Date.now() - start
      if (this.config.retry.timeout && elapsed > this.config.retry.timeout) {
        throw new E_LOCK_TIMEOUT()
      }

      await setTimeout(this.config.retry.delay ?? 250)
    }

    this.config.logger.debug({ key: this.key }, 'Lock acquired')
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

  /**
   * Force release the lock
   */
  async forceRelease() {
    await this.lockStore.forceRelease(this.key)
  }

  /**
   * Release the lock
   */
  async release() {
    await this.lockStore.delete(this.key, this.#owner)
  }

  /**
   * Returns true if the lock is expired
   */
  async isExpired() {
    return false
  }

  /**
   * Returns true if the lock is currently locked
   */
  async isLocked() {
    return await this.lockStore.exists(this.key)
  }
}
