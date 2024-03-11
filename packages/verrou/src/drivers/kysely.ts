import type { Kysely } from 'kysely'

import { E_LOCK_NOT_OWNED } from '../errors.js'
import type { KyselyOptions, LockStore } from '../types/main.js'

/**
 * Create a new knex store
 */
export function knexStore(config: KyselyOptions) {
  return { config, factory: () => new KyselyStore(config) }
}

export class KyselyStore implements LockStore {
  /**
   * Knex connection instance
   */
  #connection: Kysely<any>

  /**
   * The name of the table used to store locks
   */
  #tableName = 'verrou'

  /**
   * A promise that resolves when the table is created
   */
  #initialized: Promise<void>

  constructor(config: KyselyOptions) {
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
    await this.#connection.schema
      .createTable(this.#tableName)
      .addColumn('key', 'varchar(255)', (col) => col.primaryKey().notNull())
      .addColumn('owner', 'varchar(255)', (col) => col.notNull())
      .addColumn('expiration', 'bigint')
      .ifNotExists()
      .execute()
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
      .selectFrom(this.#tableName)
      .where('key', '=', key)
      .select('owner')
      .executeTakeFirst()

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
        .insertInto(this.#tableName)
        .values({ key, owner, expiration: this.#computeExpiresAt(ttl) })
        .execute()

      return true
    } catch (error) {
      const updated = await this.#connection
        .updateTable(this.#tableName)
        .where('key', '=', key)
        .where('expiration', '<=', Date.now())
        .set({ owner, expiration: this.#computeExpiresAt(ttl) })
        .executeTakeFirst()

      return updated.numUpdatedRows >= BigInt(1)
    }
  }

  /**
   * Delete the lock from the store if it is owned by the owner
   * Otherwise throws a E_LOCK_NOT_OWNED error
   */
  async delete(key: string, owner: string): Promise<void> {
    const currentOwner = await this.#getCurrentOwner(key)
    if (currentOwner !== owner) throw new E_LOCK_NOT_OWNED()

    await this.#connection
      .deleteFrom(this.#tableName)
      .where('key', '=', key)
      .where('owner', '=', owner)
      .execute()
  }

  /**
   * Force delete the lock from the store. No check is made on the owner
   */
  async forceDelete(key: string) {
    await this.#connection.deleteFrom(this.#tableName).where('key', '=', key).execute()
  }

  /**
   * Extend the lock expiration. Throws an error if the lock is not owned by the owner
   * Duration is in milliseconds
   */
  async extend(key: string, owner: string, duration: number) {
    const updated = await this.#connection
      .updateTable(this.#tableName)
      .where('key', '=', key)
      .where('owner', '=', owner)
      .set({ expiration: Date.now() + duration })
      .executeTakeFirst()

    if (updated.numUpdatedRows === BigInt(0)) throw new E_LOCK_NOT_OWNED()
  }

  /**
   * Check if the lock exists
   */
  async exists(key: string) {
    await this.#initialized
    const result = await this.#connection
      .selectFrom(this.#tableName)
      .where('key', '=', key)
      .select('expiration')
      .executeTakeFirst()

    if (!result) return false
    if (result.expiration === null) return true

    return result.expiration > Date.now()
  }

  /**
   * Disconnect kysely connection
   */
  disconnect() {
    return this.#connection.destroy()
  }
}
