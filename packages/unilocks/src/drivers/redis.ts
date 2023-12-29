import { Redis as IoRedis } from 'ioredis'
import { setTimeout } from 'node:timers/promises'
import type { RedisOptions as IoRedisOptions } from 'ioredis'

import type { MutexLock, MutexProvider } from '../types.js'
import { E_RELEASE_NOT_OWNED, E_LOCK_TIMEOUT } from '../errors.js'

export class RedisMutexLock implements MutexLock {
  constructor(
    protected connection: IoRedis,
    protected key: string,
    protected owner: string,
    protected options: {
      acquireTimeout?: number
      retryInterval?: number
    },
  ) {}

  async release() {
    const result = await this.connection.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end`,
      1,
      this.key,
      this.owner,
    )

    if (result === 0) throw new E_RELEASE_NOT_OWNED()
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
    const result = await this.connection.get(this.key)
    return !!result
  }

  async tryAcquire() {
    const result = await this.connection.setnx(this.key, this.owner)
    return result === 1
  }

  async acquire() {
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
}

export class RedisMutexProvider implements MutexProvider {
  #connection: IoRedis

  constructor(config: { connection: IoRedis | IoRedisOptions }) {
    if (config.connection instanceof IoRedis) {
      this.#connection = config.connection
      return
    }

    this.#connection = new IoRedis(config.connection)
  }

  createLock(key: string, timeout?: number | undefined) {
    const owner = Math.random().toString(36).slice(2)
    return new RedisMutexLock(this.#connection, key, owner, { acquireTimeout: timeout })
  }
}
