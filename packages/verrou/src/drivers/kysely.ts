import { PostgresAdapter, type Kysely } from 'kysely'

import { DatabaseStore } from './database.js'
import type { DatabaseAdapter, KyselyOptions } from '../types/main.js'

/**
 * Create a new Kysely store
 */
export function kyselyStore(config: KyselyOptions) {
  return {
    config,
    factory: () => {
      const adapter = new KyselyAdapter(config.connection)
      return new DatabaseStore(adapter, config)
    },
  }
}

/**
 * Kysely adapter for the DatabaseStore
 */
export class KyselyAdapter implements DatabaseAdapter {
  #connection: Kysely<any>
  #tableName!: string

  constructor(connection: Kysely<any>) {
    this.#connection = connection
  }

  setTableName(tableName: string) {
    this.#tableName = tableName
  }

  async createTableIfNotExists() {
    const isPg = this.#connection.getExecutor().adapter instanceof PostgresAdapter

    await this.#connection.schema
      .createTable(this.#tableName)
      .addColumn('key', 'varchar(255)', (col) => col.primaryKey().notNull())
      .addColumn('owner', 'varchar(255)', (col) => col.notNull())
      .addColumn('expiration', 'bigint', (col) => {
        if (!isPg) col.unsigned()
        return col
      })
      .ifNotExists()
      .execute()
  }

  async insertLock(lock: { key: string; owner: string; expiration: number | null }) {
    await this.#connection
      .insertInto(this.#tableName)
      .values({
        key: lock.key,
        owner: lock.owner,
        expiration: lock.expiration,
      })
      .execute()
  }

  async acquireLock(lock: { key: string; owner: string; expiration: number | null }) {
    const updated = await this.#connection
      .updateTable(this.#tableName)
      .where('key', '=', lock.key)
      .where('expiration', '<=', Date.now())
      .set({ owner: lock.owner, expiration: lock.expiration })
      .executeTakeFirst()

    return Number(updated.numUpdatedRows)
  }

  async deleteLock(key: string, owner?: string | undefined) {
    await this.#connection
      .deleteFrom(this.#tableName)
      .where('key', '=', key)
      .$if(owner !== undefined, (query) => query.where('owner', '=', owner))
      .execute()
  }

  async extendLock(key: string, owner: string, duration: number) {
    const updated = await this.#connection
      .updateTable(this.#tableName)
      .where('key', '=', key)
      .where('owner', '=', owner)
      .set({ expiration: Date.now() + duration })
      .executeTakeFirst()

    return Number(updated.numUpdatedRows)
  }

  async getLock(key: string) {
    const result = await this.#connection
      .selectFrom(this.#tableName)
      .where('key', '=', key)
      .select(['owner', 'expiration'])
      .executeTakeFirst()

    return result
  }
}
