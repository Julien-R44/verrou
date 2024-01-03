import { noopLogger } from 'typescript-log'

import { Lock } from './lock.js'
import { resolveDuration } from './helpers.js'
import type { Duration, LockFactoryConfig, LockFactoryOptions, LockStore } from './types/main.js'

export class LockFactory {
  /**
   * Default TTL for locks. 30 seconds.
   */
  static #kDefaultTtl = 30_000

  /**
   * Resolved LockFactory configuration
   */
  #config: LockFactoryConfig

  constructor(
    protected readonly store: LockStore,
    options: LockFactoryOptions = {},
  ) {
    this.#config = {
      retry: { attempts: null, delay: 250, ...options.retry },
      logger: (options.logger ?? noopLogger()).child({ pkg: 'verrou' }),
    }
  }

  /**
   * Create a new lock
   */
  createLock(name: string, ttl: Duration = LockFactory.#kDefaultTtl) {
    return new Lock(name, this.store, this.#config, undefined, resolveDuration(ttl))
  }

  /**
   * Restore a lock from a previous owner. This is particularly useful
   * if you want to release a lock from a different process than the one
   * that acquired it.
   */
  restoreLock(name: string, owner: string, ttl: Duration = LockFactory.#kDefaultTtl) {
    return new Lock(name, this.store, this.#config, owner, resolveDuration(ttl))
  }

  /**
   * Disconnect the store ( if applicable )
   */
  disconnect() {
    return this.store.disconnect()
  }
}
