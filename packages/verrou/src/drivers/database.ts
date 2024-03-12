import { E_LOCK_NOT_OWNED } from '../errors.js'
import type { DatabaseAdapter, DatabaseOptions } from '../types/drivers.js'

/**
 * A store that uses a database to store locks
 *
 * You should provide an adapter that will handle the database interactions
 */
export class DatabaseStore {
  #adapter: DatabaseAdapter
  #initialized: Promise<void>

  constructor(adapter: DatabaseAdapter, config: DatabaseOptions) {
    this.#adapter = adapter
    this.#adapter.setTableName(config.tableName || 'verrou')

    if (config.autoCreateTable !== false) {
      this.#initialized = this.#adapter.createTableIfNotExists()
    } else {
      this.#initialized = Promise.resolve()
    }
  }

  /**
   * Compute the expiration date based on the provided TTL
   */
  #computeExpiresAt(ttl: number | null) {
    if (ttl) return Date.now() + ttl
    return null
  }

  /**
   * Get the current owner of given lock key
   */
  async #getCurrentOwner(key: string) {
    await this.#initialized
    const lock = await this.#adapter.getLock(key)

    return lock?.owner
  }

  /**
   * Save the lock in the store if not already locked by another owner
   *
   * We basically rely on primary key constraint to ensure the lock is
   * unique.
   *
   * If the lock already exists, we check if it's expired. If it is, we
   * update it with the new owner and expiration date.
   */
  async save(key: string, owner: string, ttl: number | null) {
    await this.#initialized
    try {
      await this.#adapter.insertLock({ key, owner, expiration: this.#computeExpiresAt(ttl) })
      return true
    } catch (error) {
      const updatedRows = await this.#adapter.acquireLock({
        key,
        owner,
        expiration: this.#computeExpiresAt(ttl),
      })

      return updatedRows > 0
    }
  }

  /**
   * Delete the lock from the store if it is owned by the owner
   * Otherwise throws a E_LOCK_NOT_OWNED error
   */
  async delete(key: string, owner: string): Promise<void> {
    const currentOwner = await this.#getCurrentOwner(key)
    if (currentOwner !== owner) throw new E_LOCK_NOT_OWNED()

    await this.#adapter.deleteLock(key, owner)
  }

  /**
   * Force delete the lock from the store. No check is made on the owner
   */
  async forceDelete(key: string) {
    await this.#adapter.deleteLock(key)
  }

  /**
   * Extend the lock expiration. Throws an error if the lock is not owned by the owner
   * Duration is in milliseconds
   */
  async extend(key: string, owner: string, duration: number) {
    await this.#initialized
    const updated = await this.#adapter.extendLock(key, owner, duration)

    if (updated === 0) throw new E_LOCK_NOT_OWNED()
  }

  /**
   * Check if the lock exists
   */
  async exists(key: string) {
    await this.#initialized
    const lock = await this.#adapter.getLock(key)

    if (!lock) return false
    if (lock.expiration === null) return true

    return lock.expiration > Date.now()
  }

  async disconnect() {}
}
