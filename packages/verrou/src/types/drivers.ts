import { type Knex } from 'knex'
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
