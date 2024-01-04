import { setTimeout } from 'node:timers/promises'
import { InvalidArgumentsException } from '@poppinss/utils'

import { E_LOCK_TIMEOUT } from './errors.js'
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
    this.#lockStore = lockStore
    this.#expirationTime = expirationTime ?? null
    this.#owner = owner ?? this.#generateOwner()
    this.#ttl = ttl ?? null
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
      const result = await this.#lockStore.save(this.#key, this.#owner, this.#ttl)
      if (result) {
        this.#expirationTime = this.#ttl ? now + this.#ttl : null
        break
      }

      if (attemptsDone === attemptsMax) throw new E_LOCK_TIMEOUT()

      const elapsed = Date.now() - start
      if (timeout && elapsed > timeout) throw new E_LOCK_TIMEOUT()

      await setTimeout(delay)
    }

    this.#config.logger.debug({ key: this.#key }, 'Lock acquired')
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
    await this.#lockStore.forceDelete(this.#key)
  }

  /**
   * Release the lock
   */
  async release() {
    await this.#lockStore.delete(this.#key, this.#owner)
  }

  /**
   * Returns true if the lock is expired
   */
  isExpired() {
    if (this.#expirationTime === null) return false
    return this.#expirationTime < Date.now()
  }

  /**
   * Get the remaining time before the lock expires
   */
  getRemainingTime() {
    if (this.#expirationTime === null) return null
    return this.#expirationTime - Date.now()
  }

  /**
   * Extends the lock TTL
   */
  async extend(ttl?: Duration) {
    const resolvedTtl = ttl ? resolveDuration(ttl) : this.#ttl
    if (!resolvedTtl) throw new InvalidArgumentsException('Cannot extend a lock without TTL')

    const now = Date.now()
    await this.#lockStore.extend(this.#key, this.#owner, resolvedTtl)
    this.#expirationTime = now + resolvedTtl
  }

  /**
   * Returns true if the lock is currently locked
   */
  async isLocked() {
    return await this.#lockStore.exists(this.#key)
  }
}
