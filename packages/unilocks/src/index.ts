import { Redis as IoRedis } from 'ioredis'
import { createError } from '@poppinss/utils'
import type { MutexInterface } from 'async-mutex'
import { setTimeout } from 'node:timers/promises'
import { E_TIMEOUT, Mutex, withTimeout } from 'async-mutex'
import type { RedisOptions as IoRedisOptions } from 'ioredis'

export const E_RELEASE_NOT_OWNED = createError(
  `It looks like you are trying to release a lock that is not acquired by you. Make sure to acquire the lock before trying to release it`,
  'E_RELEASE_NOT_OWNED',
)

export const E_LOCK_TIMEOUT = createError<[number]>(
  `Lock was not acquired in the given timeout ( %s ms )`,
  'E_LOCK_TIMEOUT',
)

export interface MutexLock {
  acquire(): Promise<void>
  release(): Promise<void>
  runExclusive<T>(callback: () => Promise<T>): Promise<T>
  isLocked(): Promise<boolean>
}

export interface MutexProvider {
  createLock(key: string, timeout?: number): MutexLock
}

export class MemoryMutexProvider implements MutexProvider {
  #locks = new Map<string, MutexInterface>()

  /**
   * For a given key, get or create a new lock
   *
   * @param key Key to get or create a lock for
   * @param timeout Time to wait to acquire the lock
   */
  getOrCreateForKey(key: string, timeout?: number) {
    let lock = this.#locks.get(key)
    if (!lock) {
      lock = new Mutex()
      this.#locks.set(key, lock)
    }

    return timeout ? withTimeout(lock, timeout) : lock
  }

  createLock(key: string, timeout?: number) {
    const mutex = this.getOrCreateForKey(key, timeout)
    return new MemoryMutexLock(mutex, { acquireTimeout: timeout })
  }
}

export class MemoryMutexLock implements MutexLock {
  #releaser: MutexInterface.Releaser | null = null

  constructor(
    protected lock: MutexInterface,
    protected options: { acquireTimeout?: number },
  ) {}

  async acquire() {
    try {
      this.#releaser = await this.lock.acquire()
    } catch (error) {
      if (error === E_TIMEOUT) {
        throw new E_LOCK_TIMEOUT([this.options.acquireTimeout!])
      }

      throw error
    }
  }

  async release() {
    if (!this.#releaser) throw new E_RELEASE_NOT_OWNED()

    this.#releaser()
  }

  runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    return this.lock.runExclusive(callback)
  }

  async isLocked() {
    return this.lock.isLocked()
  }
}

export class RedisMutexLock implements MutexLock {
  constructor(
    protected connection: IoRedis,
    protected key: string,
    protected owner: string = '1',
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

  runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    throw new Error('Method not implemented.')
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
