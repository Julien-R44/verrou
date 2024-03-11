import type { Knex } from 'knex'

import { E_LOCK_NOT_OWNED } from '../errors.js'
import type { KnexStoreOptions, LockStore } from '../types/main.js'

/**
 * Create a new database store
 */
export function knexStore(config: KnexStoreOptions) {
  return { config, factory: () => new KnexStore(config) }
}

export class KnexStore implements LockStore {
  /**
   * Knex connection instance
   */
  #connection: Knex

  /**
   * The name of the table used to store locks
   */
  #tableName = 'verrou'

  /**
   * A promise that resolves when the table is created
   */
  #initialized: Promise<void>

  constructor(config: KnexStoreOptions) {
    this.#connection = config.connection
    this.#tableName = config.tableName || this.#tableName
    if (config.autoCreateTable !== false) {
      this.#initialized = this.#createTableIfNotExists()
    } else {
      this.#initialized = Promise.resolve()
    }
  }

  /**
   * Create the locks table if it doesn't exist
   */
  async #createTableIfNotExists() {
    const hasTable = await this.#connection.schema.hasTable(this.#tableName)
    if (hasTable) return

    await this.#connection.schema.createTable(this.#tableName, (table) => {
      table.string('key', 255).notNullable().primary()
      table.string('owner').notNullable()
      table.bigint('expiration').unsigned().nullable()
    })
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
    const result = await this.#connection
      .table(this.#tableName)
      .where('key', key)
      .select('owner')
      .first()

    return result?.owner
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
    try {
      await this.#initialized
      await this.#connection
        .table(this.#tableName)
        .insert({ key, owner, expiration: this.#computeExpiresAt(ttl) })

      return true
    } catch (error) {
      const updated = await this.#connection
        .table(this.#tableName)
        .where('key', key)
        .where('expiration', '<=', Date.now())
        .update({ owner, expiration: this.#computeExpiresAt(ttl) })

      return updated >= 1
    }
  }

  /**
   * Delete the lock from the store if it is owned by the owner
   * Otherwise throws a E_LOCK_NOT_OWNED error
   */
  async delete(key: string, owner: string): Promise<void> {
    const currentOwner = await this.#getCurrentOwner(key)
    if (currentOwner !== owner) throw new E_LOCK_NOT_OWNED()

    await this.#connection.table(this.#tableName).where('key', key).where('owner', owner).delete()
  }

  /**
   * Force delete the lock from the store. No check is made on the owner
   */
  async forceDelete(key: string) {
    await this.#connection.table(this.#tableName).where('key', key).delete()
  }

  /**
   * Extend the lock expiration. Throws an error if the lock is not owned by the owner
   * Duration is in milliseconds
   */
  async extend(key: string, owner: string, duration: number) {
    const updated = await this.#connection
      .table(this.#tableName)
      .where('key', key)
      .where('owner', owner)
      .update({ expiration: Date.now() + duration })

    if (updated === 0) throw new E_LOCK_NOT_OWNED()
  }

  /**
   * Check if the lock exists
   */
  async exists(key: string) {
    await this.#initialized
    const result = await this.#connection
      .table(this.#tableName)
      .where('key', key)
      .select('expiration')
      .first()

    if (!result) return false
    if (result.expiration === null) return true

    return result.expiration > Date.now()
  }

  /**
   * Disconnect knex connection
   */
  disconnect() {
    return this.#connection.destroy()
  }
}
