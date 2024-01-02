import knex, { type Knex } from 'knex'

import { E_RELEASE_NOT_OWNED } from '../errors.js'
import type { DatabaseStoreOptions, Duration, LockStore } from '../types/main.js'

export class DatabaseStore implements LockStore {
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

  constructor(config: DatabaseStoreOptions) {
    this.#connection = this.#createConnection(config)
    this.#tableName = config.tableName || this.#tableName
    this.#initialized = this.#createTableIfNotExists()
  }

  /**
   * Create a Knex connection instance
   */
  #createConnection(config: DatabaseStoreOptions) {
    if (typeof config.connection === 'string') {
      return knex({ client: config.dialect, connection: config.connection, useNullAsDefault: true })
    }

    /**
     * This looks hacky. Maybe we can find a better way to do this?
     * We check if config.connection is a Knex object. If it is, we
     * return it as is. If it's not, we create a new Knex object
     */
    if ('with' in config.connection!) {
      return config.connection
    }

    return knex({ client: config.dialect, connection: config.connection, useNullAsDefault: true })
  }

  /**
   * Create the cache table if it doesn't exist
   */
  async #createTableIfNotExists() {
    const hasTable = await this.#connection.schema.hasTable(this.#tableName)
    if (hasTable) return

    await this.#connection.schema.createTable(this.#tableName, (table) => {
      table.string('key', 255).notNullable().primary()
      table.string('owner').notNullable()
      table.bigint('expiration').notNullable()
    })
  }

  extend(_key: string, _duration: Duration): Promise<void> {
    throw new Error('Method not implemented.')
  }

  #expireAt() {
    return Date.now() + 86_400
  }

  async #getCurrentOwner(key: string) {
    await this.#initialized
    const result = await this.#connection
      .table(this.#tableName)
      .where('key', key)
      .select('owner')
      .first()

    return result?.owner
  }

  async save(key: string, owner: string) {
    try {
      await this.#initialized
      await this.#connection
        .table(this.#tableName)
        .insert({ key, owner, expiration: this.#expireAt() })

      return true
    } catch (error) {
      const updated = await this.#connection
        .table(this.#tableName)
        .where('key', key)
        .where('expiration', '<=', Date.now())
        .update({ owner, expiration: this.#expireAt() })

      return updated === 1
    }
  }

  async delete(key: string, owner: string): Promise<void> {
    const currentOwner = await this.#getCurrentOwner(key)
    if (currentOwner !== owner) throw new E_RELEASE_NOT_OWNED()

    await this.#connection.table(this.#tableName).where('key', key).where('owner', owner).delete()
  }

  async exists(key: string) {
    await this.#initialized
    const result = await this.#connection
      .table(this.#tableName)
      .where('key', key)
      .select('expiration')
      .first()

    if (!result) return false
    return result.expiration > Date.now()
  }
}
