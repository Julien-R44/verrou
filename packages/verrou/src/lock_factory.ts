import { noopLogger } from 'typescript-log'

import { Lock } from './lock.js'
import { resolveDuration } from './helpers.js'
import type {
  Duration,
  ResolvedLockConfig,
  LockFactoryOptions,
  LockStore,
  SerializedLock,
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
   * The store used to persist locks
   */
  #store: LockStore

  /**
   * Resolved LockFactory configuration
   */
  #config: ResolvedLockConfig

  constructor(store: LockStore, options: LockFactoryOptions = {}) {
    this.#store = store
    this.#config = {
      retry: {
        attempts: options.retry?.attempts ?? LockFactory.#kDefaults.retry.attempts,
        delay: resolveDuration(options.retry?.delay, null) ?? LockFactory.#kDefaults.retry.delay,
        timeout: resolveDuration(options.retry?.timeout, null),
      },
      logger: (options.logger ?? noopLogger()).child({ pkg: 'verrou' }),
    }
  }

  /**
   * Create a new lock
   */
  createLock(name: string, ttl: Duration = LockFactory.#kDefaults.ttl) {
    return new Lock(name, this.#store, this.#config, undefined, resolveDuration(ttl))
  }

  /**
   * Restore a lock from a previous owner. This is particularly useful
   * if you want to release a lock from a different process than the one
   * that acquired it.
   */
  restoreLock(lock: SerializedLock) {
    return new Lock(lock.key, this.#store, this.#config, lock.owner, lock.ttl, lock.expirationTime)
  }
}
