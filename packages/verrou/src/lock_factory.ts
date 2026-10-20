import { noopLogger } from '@julr/utils/logger'

import { Lock } from './lock.js'
import { resolveDuration } from './helpers.js'
import { LockLifecycle } from './lock_lifecycle.js'
import type {
  Duration,
  ResolvedLockConfig,
  LockFactoryOptions,
  LockStore,
  SerializedLock,
  ShutdownOptions,
} from './types/main.js'

export class LockFactory {
  /**
   * Default configuration values
   */
  static #kDefaults = {
    ttl: 30_000,
    retry: {
      attempts: Number.POSITIVE_INFINITY,
      delay: 250,
      timeout: undefined,
    },
  }

  /**
   * The store and lifecycle of locks created by this factory
   */
  #lifecycle: LockLifecycle

  /**
   * Resolved LockFactory configuration
   */
  #config: ResolvedLockConfig

  constructor(store: LockStore, options: LockFactoryOptions = {}) {
    this.#lifecycle = new LockLifecycle(store)
    this.#config = {
      retry: {
        attempts: options.retry?.attempts ?? LockFactory.#kDefaults.retry.attempts,
        delay: resolveDuration(options.retry?.delay, null) ?? LockFactory.#kDefaults.retry.delay,
        timeout: resolveDuration(options.retry?.timeout, null),
      },
      logger: (options.logger ?? noopLogger()).child({ pkg: 'verrou' }),
      lifecycle: this.#lifecycle,
    }
  }

  /**
   * Create a new lock
   */
  createLock(name: string, ttl: Duration = LockFactory.#kDefaults.ttl) {
    return new Lock(name, this.#lifecycle, this.#config, undefined, resolveDuration(ttl))
  }

  /**
   * Restore a lock from a previous owner. This is particularly useful
   * if you want to release a lock from a different process than the one
   * that acquired it.
   */
  restoreLock(lock: SerializedLock) {
    return new Lock(
      lock.key,
      this.#lifecycle,
      this.#config,
      lock.owner,
      lock.ttl,
      lock.expirationTime,
    )
  }

  /**
   * Stop acquisitions, wait for running callbacks, and release held locks.
   * Repeated calls return the same promise. Connections remain open.
   */
  shutdown(options: ShutdownOptions = {}) {
    return this.#lifecycle.shutdown(options)
  }
}
