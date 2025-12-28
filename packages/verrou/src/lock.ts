import { setTimeout } from 'node:timers/promises'
import { InvalidArgumentsException } from '@poppinss/utils/exceptions'

import { resolveDuration } from './helpers.js'
import type {
  Duration,
  LockAcquireOptions,
  ResolvedLockConfig,
  LockStore,
  SerializedLock,
} from './types/main.js'

export class Lock {
  #key: string
  #owner: string
  #lockStore: LockStore
  #ttl: number | null = null
  #config: ResolvedLockConfig
  #expirationTime: number | null = null

  constructor(
    key: string,
    lockStore: LockStore,
    config: ResolvedLockConfig,
    owner?: string,
    ttl?: number | null,
    expirationTime?: number | null,
  ) {
    this.#key = key
    this.#config = config
    this.#ttl = ttl ?? null
    this.#lockStore = lockStore
    this.#expirationTime = expirationTime ?? null
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
   * Serialize the lock
   */
  serialize(): SerializedLock {
    return {
      key: this.#key,
      owner: this.#owner,
      ttl: this.#ttl,
      expirationTime: this.#expirationTime,
    }
  }

  /**
   * Acquire the lock
   */
  async acquire(options: LockAcquireOptions = {}) {
    this.#expirationTime = null

    let attemptsDone = 0
    const attemptsMax = options.retry?.attempts ?? this.#config.retry.attempts
    const delay = resolveDuration(options.retry?.delay, this.#config.retry.delay)
    const timeout = resolveDuration(options.retry?.timeout, this.#config.retry.timeout)

    const start = Date.now()
    while (attemptsDone++ < attemptsMax) {
      const now = Date.now()

      /**
       * Try to acquire the lock
       */
      const result = await this.#lockStore.save(this.#key, this.#owner, this.#ttl)
      if (result) {
        this.#expirationTime = this.#ttl ? now + this.#ttl : null
        break
      }

      /**
       * Check if we reached the maximum number of attempts
       */
      if (attemptsDone === attemptsMax) return false

      /**
       * Or check if we reached the timeout
       */
      const elapsed = Date.now() - start
      if (timeout && elapsed > timeout) return false

      /**
       * Otherwise wait for the delay and try again
       */
      await setTimeout(delay)
    }

    this.#config.logger.debug({ key: this.#key }, 'Lock acquired')
    return true
  }

  /**
   * Try to acquire the lock immediately or throw an error
   */
  async acquireImmediately() {
    const result = await this.#lockStore.save(this.#key, this.#owner, this.#ttl)
    if (!result) return false
    this.#expirationTime = this.#ttl ? Date.now() + this.#ttl : null

    this.#config.logger.debug({ key: this.#key }, 'Lock acquired with acquireImmediately()')
    return true
  }

  /**
   * Acquire the lock, run the callback and release the lock automatically
   * after the callback is done.
   * Also returns the callback return value
   */
  async run<T>(callback: () => Promise<T>): Promise<[true, T] | [false, null]> {
    const handle = await this.acquire()
    if (!handle) return [false, null]

    try {
      const result = await callback()
      return [true, result]
    } finally {
      await this.release()
    }
  }

  /**
   * Same as `run` but try to acquire the lock immediately
   * Or throw an error if the lock is already acquired
   */
  async runImmediately<T>(callback: () => Promise<T>): Promise<[true, T] | [false, null]> {
    const handle = await this.acquireImmediately()
    if (!handle) return [false, null]

    try {
      const result = await callback()
      return [true, result]
    } finally {
      if (handle) await this.release()
    }
  }

  /**
   * Force release the lock
   */
  async forceRelease() {
    await this.#lockStore.forceDelete(this.#key)
  }

  /**
   * Release the lock
   */
  async release() {
    await this.#lockStore.delete(this.#key, this.#owner)
    this.#config.logger.debug({ key: this.#key }, 'Lock released')
  }

  /**
   * Returns true if the lock is expired
   */
  isExpired() {
    if (this.#expirationTime === null) return false
    return this.#expirationTime < Date.now()
  }

  /**
   * Get the remaining time in milliseconds before the lock expires
   */
  getRemainingTime() {
    if (this.#expirationTime === null) return null
    return this.#expirationTime - Date.now()
  }

  /**
   * Extends the lock TTL
   *
   * Note: this resets the lock TTL, it does not
   * add duration to the current lock TTL
   */
  async extend(ttl?: Duration) {
    const resolvedTtl = ttl ? resolveDuration(ttl) : this.#ttl
    if (!resolvedTtl) throw new InvalidArgumentsException('Cannot extend a lock without TTL')

    const now = Date.now()
    await this.#lockStore.extend(this.#key, this.#owner, resolvedTtl)
    this.#expirationTime = now + resolvedTtl

    this.#config.logger.debug({ key: this.#key, newTtl: this.#expirationTime }, 'Lock extended')
  }

  /**
   * Returns true if the lock is currently locked
   */
  async isLocked() {
    return await this.#lockStore.exists(this.#key)
  }
}
