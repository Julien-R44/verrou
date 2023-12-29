import knex, { type Knex } from 'knex'
import { setTimeout } from 'node:timers/promises'

import { E_LOCK_TIMEOUT, E_RELEASE_NOT_OWNED } from '../errors.js'
import type { DialectName, MutexLock, MutexProvider } from '../types/main.js'

export type DatabaseMutexProviderOptions = {
  dialect: DialectName
  connection: Knex | Knex.Config['connection']
  tableName?: string
}

export class DatabaseMutexLock implements MutexLock {
  constructor(
    protected connection: Knex,
    protected key: string,
    protected owner: string,
    protected options: {
      acquireTimeout?: number
      retryInterval?: number
      tableName: string
      initialized: Promise<void>
    },
  ) {}

  #expireAt() {
    return Date.now() + 86_400
  }

  async #getCurrentOwner() {
    await this.options.initialized
    const result = await this.connection
      .table(this.options.tableName)
      .where('key', this.key)
      .select('owner')
      .first()

    return result?.owner
  }

  async tryAcquire() {
    try {
      await this.options.initialized
      await this.connection
        .table(this.options.tableName)
        .insert({ key: this.key, owner: this.owner, expiration: this.#expireAt() })

      return true
    } catch (error) {
      const updated = await this.connection
        .table(this.options.tableName)
        .where('key', this.key)
        .where('expiration', '<=', Date.now())
        .update({ owner: this.owner, expiration: this.#expireAt() })

      return updated === 1
    }
  }

  async acquire(): Promise<void> {
    const start = Date.now()

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await this.tryAcquire()
      if (result) return

      const elapsed = Date.now() - start
      if (this.options.acquireTimeout && elapsed > this.options.acquireTimeout) {
        throw new E_LOCK_TIMEOUT([this.options.acquireTimeout])
      }

      await setTimeout(this.options.retryInterval ?? 250)
    }
  }

  async release(): Promise<void> {
    const currentOwner = await this.#getCurrentOwner()
    if (currentOwner !== this.owner) throw new E_RELEASE_NOT_OWNED()

    await this.connection
      .table(this.options.tableName)
      .where('key', this.key)
      .where('owner', this.owner)
      .delete()
  }

  async run<T>(callback: () => Promise<T>): Promise<T> {
    try {
      await this.acquire()
      return await callback()
    } finally {
      await this.release()
    }
  }

  async isLocked(): Promise<boolean> {
    await this.options.initialized
    const result = await this.connection
      .table(this.options.tableName)
      .where('key', this.key)
      .select('expiration')
      .first()

    if (!result) return false
    return result.expiration > Date.now()
  }
}

export class DatabaseMutexProvider implements MutexProvider {
  /**
   * Knex connection instance
   */
  protected connection: Knex

  /**
   * The name of the table used to store locks
   */
  protected tableName = 'locks'

  /**
   * A promise that resolves when the table is created
   */
  protected initialized: Promise<void>

  constructor(config: DatabaseMutexProviderOptions) {
    this.connection = this.#createConnection(config)
    this.tableName = config.tableName || this.tableName
    this.initialized = this.#createTableIfNotExists()
  }

  /**
   * Create a Knex connection instance
   */
  #createConnection(config: DatabaseMutexProviderOptions) {
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
    const hasTable = await this.connection.schema.hasTable(this.tableName)
    if (hasTable) return

    await this.connection.schema.createTable(this.tableName, (table) => {
      table.string('key', 255).notNullable().primary()
      table.string('owner').notNullable()
      table.bigint('expiration').notNullable()
    })
  }

  createLock(key: string, timeout?: number | undefined): MutexLock {
    const owner = Math.random().toString(36).slice(2)
    return new DatabaseMutexLock(this.connection, key, owner, {
      acquireTimeout: timeout,
      tableName: this.tableName,
      initialized: this.initialized,
    })
  }
}
