import { Redis as IoRedis } from 'ioredis'

import { E_LOCK_NOT_OWNED, E_RELEASE_NOT_OWNED } from '../errors.js'
import type { LockStore, RedisStoreOptions } from '../types/main.js'

/**
 * Create a new Redis store
 */
export function redisStore(options: RedisStoreOptions) {
  return { factory: () => new RedisStore(options) }
}

export class RedisStore implements LockStore {
  /**
   * IORedis connection instance
   */
  #connection: IoRedis

  constructor(options: RedisStoreOptions) {
    if (options.connection instanceof IoRedis) {
      this.#connection = options.connection
    } else {
      this.#connection = new IoRedis(options.connection)
    }
  }

  /**
   * Delete a lock
   */
  async delete(key: string, owner: string) {
    const lua = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `

    const result = await this.#connection.eval(lua, 1, key, owner)
    if (result === 0) throw new E_RELEASE_NOT_OWNED()
  }

  /**
   * Force delete a lock
   */
  async forceRelease(key: string) {
    await this.#connection.del(key)
  }

  /**
   * Check if a lock exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.#connection.get(key)
    return !!result
  }

  /**
   * Save a lock
   */
  async save(key: string, owner: string, ttl: number | null) {
    if (ttl) {
      const result = await this.#connection.set(key, owner, 'PX', ttl, 'NX')
      return result === 'OK'
    }

    const result = await this.#connection.setnx(key, owner)
    return result === 1
  }

  /**
   * Extend a lock
   */
  async extend(key: string, owner: string, duration: number) {
    const lua = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `

    const result = await this.#connection.eval(lua, 1, key, owner, duration)
    if (result === 0) throw new E_LOCK_NOT_OWNED()
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    await this.#connection.quit()
  }
}
