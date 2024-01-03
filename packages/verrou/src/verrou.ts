import { LockFactory } from './lock_factory.js'
import type { Duration, StoreFactory } from './types/main.js'

/**
 * Verrou is the main class of the library. It is used to create locks
 * and to access the underlying stores.
 */
export class Verrou<KnownStores extends Record<string, StoreFactory>> {
  /**
   * The name of the default store
   */
  #defaultStoreName: keyof KnownStores

  /**
   * The list of stores
   */
  #stores: KnownStores

  /**
   * A cache of store instances. We are re-using the same store instance
   * instead of creating a new one every time
   */
  #storesCache: Map<keyof KnownStores, LockFactory> = new Map()

  constructor(config: { default: keyof KnownStores; stores: KnownStores }) {
    this.#stores = config.stores
    this.#defaultStoreName = config.default
  }

  /**
   * Access a store by its name
   */
  use<T extends keyof KnownStores>(store: T) {
    const storeToUse: keyof KnownStores | undefined = store ?? this.#defaultStoreName
    if (!storeToUse) throw new Error('No store provided')

    if (this.#storesCache.has(storeToUse)) {
      return this.#storesCache.get(storeToUse)!
    }

    const factory = new LockFactory(this.#stores[storeToUse]!.driver.factory())
    this.#storesCache.set(storeToUse, factory)

    return factory
  }

  /**
   * Create a new lock using the default store
   */
  createLock(name: string, ttl?: Duration) {
    return this.use(this.#defaultStoreName).createLock(name, ttl)
  }

  /**
   * Restore a lock from a previous owner. This is particularly useful
   * if you want to release a lock from a different process than the one
   * that acquired it.
   */
  restoreLock(name: string, owner: string, ttl?: Duration) {
    return this.use(this.#defaultStoreName).restoreLock(name, owner, ttl)
  }

  /**
   * Disconnect the default store
   */
  async disconnect() {
    await this.use(this.#defaultStoreName).disconnect()
  }

  /**
   * Disconnect all connections to the stores
   */
  async disconnectAll() {
    const promises = []

    for (const store of this.#storesCache.values()) {
      promises.push(store.disconnect())
    }

    await Promise.allSettled(promises)
  }
}
