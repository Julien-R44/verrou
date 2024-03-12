import type { Knex } from 'knex'

import { DatabaseStore } from './database.js'
import type { DatabaseAdapter, KnexStoreOptions } from '../types/main.js'

/**
 * Create a new knex store
 */
export function knexStore(config: KnexStoreOptions) {
  return {
    config,
    factory: () => {
      const adapter = new KnexAdapter(config.connection)
      return new DatabaseStore(adapter, config)
    },
  }
}

/**
 * Knex adapter for the DatabaseStore
 */
export class KnexAdapter implements DatabaseAdapter {
  #connection: Knex
  #tableName!: string

  constructor(connection: Knex) {
    this.#connection = connection
  }

  setTableName(tableName: string) {
    this.#tableName = tableName
  }

  async createTableIfNotExists() {
    const hasTable = await this.#connection.schema.hasTable(this.#tableName)
    if (hasTable) return

    await this.#connection.schema.createTable(this.#tableName, (table) => {
      table.string('key', 255).notNullable().primary()
      table.string('owner').notNullable()
      table.bigint('expiration').unsigned().nullable()
    })
  }

  async insertLock(lock: { key: string; owner: string; expiration: number | null }) {
    await this.#connection.table(this.#tableName).insert(lock)
  }

  async acquireLock(lock: { key: string; owner: string; expiration: number | null }) {
    const updated = await this.#connection
      .table(this.#tableName)
      .where('key', lock.key)
      .where('expiration', '<=', Date.now())
      .update({ owner: lock.owner, expiration: lock.expiration })

    return updated
  }

  async deleteLock(key: string, owner?: string | undefined) {
    await this.#connection
      .table(this.#tableName)
      .where('key', key)
      .modify((query) => {
        if (owner) query.where('owner', owner)
      })
      .delete()
  }

  async extendLock(key: string, owner: string, duration: number) {
    const updated = await this.#connection
      .table(this.#tableName)
      .where('key', key)
      .where('owner', owner)
      .update({ expiration: Date.now() + duration })

    return updated
  }

  async getLock(key: string) {
    const result = await this.#connection
      .table(this.#tableName)
      .where('key', key)
      .select(['owner', 'expiration'])
      .first()

    return result
  }
}
