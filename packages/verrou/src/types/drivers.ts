import type { Knex } from 'knex'
import type { Kysely } from 'kysely'
import type { DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import type { RedisOptions as IoRedisOptions, Redis as IoRedis } from 'ioredis'

/**
 * Common options for database stores
 */
export interface DatabaseOptions {
  /**
   * The table name to use ( to store the locks )
   *
   * @default 'verrou'
   */
  tableName?: string

  /**
   * Set to true to automatically create the table if it doesn't exist
   *
   * @default true
   */
  autoCreateTable?: boolean
}

/**
 * Options for the Knex store
 */
export interface KnexStoreOptions extends DatabaseOptions {
  /**
   * The Knex instance
   */
  connection: Knex
}

/**
 * Options for the Kysely store
 */
export interface KyselyOptions extends DatabaseOptions {
  /**
   * The Kysely instance
   */
  connection: Kysely<any>
}

/**
 * Options for the Redis store
 */
export type RedisStoreOptions = {
  /**
   * The Redis connection
   */
  connection: IoRedis | IoRedisOptions
}

/**
 * Options for the DynamoDB store
 */
export type DynamoDbOptions = {
  /**
   * DynamoDB table name to use.
   */
  table: {
    name: string
  }

  /**
   * AWS credentials
   */
  credentials?: DynamoDBClientConfig['credentials']

  /**
   * Region of your DynamoDB instance
   */
  region: DynamoDBClientConfig['region']

  /**
   * Endpoint to your DynamoDB instance
   */
  endpoint: DynamoDBClientConfig['endpoint']
}

/**
 * An adapter for the DatabaseStore
 */
export interface DatabaseAdapter {
  /**
   * Set the table name to store the locks
   */
  setTableName(tableName: string): void

  /**
   * Create the table to store the locks if it doesn't exist
   */
  createTableIfNotExists(): Promise<void>

  /**
   * Insert the given lock in the store
   */
  insertLock(lock: { key: string; owner: string; expiration: number | null }): Promise<void>

  /**
   * Acquire the lock by updating the owner and expiration date.
   *
   * The adapter should check if expiration date is in the past
   * and return the number of updated rows.
   */
  acquireLock(lock: { key: string; owner: string; expiration: number | null }): Promise<number>

  /**
   * Delete a lock from the store.
   *
   * If owner is provided, the lock should only be deleted if the owner matches.
   */
  deleteLock(key: string, owner?: string): Promise<void>

  /**
   * Extend the expiration date of the lock by the given
   * duration ( Date.now() + duration ).
   *
   * The owner must match.
   */
  extendLock(key: string, owner: string, duration: number): Promise<number>

  /**
   * Returns the current owner and expiration date of the lock
   */
  getLock(key: string): Promise<{ owner: string; expiration: number | null } | undefined>
}
