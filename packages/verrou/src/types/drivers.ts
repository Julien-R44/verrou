import type { Knex } from 'knex'
import type { Kysely } from 'kysely'
import type { DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import type { RedisOptions as IoRedisOptions, Redis as IoRedis } from 'ioredis'

export type DialectName = 'pg' | 'mysql2' | 'better-sqlite3' | 'sqlite3'

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
   * The database dialect
   */
  dialect: DialectName

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
