import type { Redis as IoRedis } from 'ioredis'

import { E_LOCK_NOT_OWNED } from '../errors.js'
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
    this.#connection = options.connection
  }

  /**
   * Save the lock in the store if not already locked by another owner
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
   * Delete the lock from the store if it is owned by the owner
   * Otherwise throws a E_LOCK_NOT_OWNED error
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
    if (result === 0) throw new E_LOCK_NOT_OWNED()
  }

  /**
   * Force delete the lock from the store. No check is made on the owner
   */
  async forceDelete(key: string) {
    await this.#connection.del(key)
  }

  /**
   * Check if the lock exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.#connection.get(key)
    return !!result
  }

  /**
   * Extend the lock expiration. Throws an error if the lock is not owned by the owner
   * Duration is in milliseconds
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
}
