import type { Logger } from 'typescript-log'

export * from './drivers.js'

/**
 * A Duration can be a number in milliseconds or a string formatted as a duration
 *
 * Formats accepted are :
 * - Simple number in milliseconds
 * - String formatted as a duration. Uses https://github.com/lukeed/ms under the hood
 * - Null to indicate no expiration
 */
export type Duration = number | string | null
export type StoreFactory = { driver: { factory: () => LockStore } }

/**
 * Shape of a lock serialized through the `Lock.serialize` method
 */
export interface SerializedLock {
  key: string
  owner: string
  ttl: number | null
  expirationTime: number | null
}

export interface RetryConfig {
  /**
   * The number of times to retry the operation before giving up.
   *
   * @default Number.POSITIVE_INFINITY
   */
  attempts?: number

  /**
   * The delay between retries
   *
   * @default 250ms
   */
  delay?: Duration

  /**
   * The maximum amount of time before giving up to acquire the lock
   * If not specified, the operation will retry indefinitely
   *
   * @default undefined ( no timeout )
   */
  timeout?: Duration
}

/**
 * Options passed to the Lock.acquire method
 */
export interface LockAcquireOptions {
  retry?: RetryConfig
}

/**
 * Options passed to the LockFactory constructor
 */
export interface LockFactoryOptions {
  retry?: RetryConfig
  logger?: Logger
}

/**
 * Resolved configuration values
 */
export interface ResolvedLockConfig {
  retry: {
    attempts: number
    delay: number
    timeout?: number
  }
  logger: Logger
}

export interface LockStore {
  /**
   * Save the lock in the store.
   * This method should return false if the given key is already locked
   *
   * @param key The key to lock
   * @param owner The owner of the lock
   * @param ttl The time to live of the lock in milliseconds. Null means no expiration
   *
   * @returns True if the lock was acquired, false otherwise
   */
  save(key: string, owner: string, ttl: number | null): Promise<boolean>

  /**
   * Delete the lock from the store if it is owned by the given owner
   * Otherwise should throws a E_LOCK_NOT_OWNED error
   *
   * @param key The key to delete
   * @param owner The owner
   */
  delete(key: string, owner: string): Promise<void>

  /**
   * Force delete the lock from the store without checking the owner
   */
  forceDelete(key: string): Promise<void>

  /**
   * Check if the lock exists. Returns true if so, false otherwise
   */
  exists(key: string): Promise<boolean>

  /**
   * Extend the lock expiration. Throws an error if the lock is not owned by
   * the given owner
   * Duration is in milliseconds
   */
  extend(key: string, owner: string, duration: number): Promise<void>
}
