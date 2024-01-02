import { type Knex } from 'knex'
import type { DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import type { RedisOptions as IoRedisOptions, Redis as IoRedis } from 'ioredis'

export type DialectName = 'pg' | 'mysql2' | 'better-sqlite3' | 'sqlite3'

export type DatabaseStoreOptions = {
  /**
   * The database dialect
   */
  dialect: DialectName

  /**
   * The database connection
   */
  connection: Knex | Knex.Config['connection']

  /**
   * The table name to use ( to store the locks )
   * Table will be automatically created if it doesn't exist
   */
  tableName?: string
}

export type RedisStoreOptions = {
  /**
   * The Redis connection
   */
  connection: IoRedis | IoRedisOptions
}

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
