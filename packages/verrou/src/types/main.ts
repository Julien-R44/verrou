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

export type StoreFactory = {
  driver: { factory: () => LockStore }
}

export interface SerializedLock {
  key: string
  owner: string
  ttl: number | null
  expirationTime: number | null
}

export interface RetryConfig {
  /**
   * The number of times to retry the operation before giving up.
   * Null means retry indefinitely
   *
   * @default null
   */
  attempts?: number | null

  /**
   * The delay between retries
   *
   * @default 250ms
   */
  delay?: number

  /**
   * The maximum amount of time before giving up to acquire the lock
   */
  timeout?: number
}

export interface LockAcquireOptions {
  retry?: RetryConfig
}

export interface LockFactoryOptions {
  retry?: RetryConfig
  logger?: Logger
}

export interface LockFactoryConfig {
  retry: RetryConfig
  logger: Logger
}

export interface LockStore {
  /**
   * Save the lock in the store if not already locked by another owner
   *
   * @param key The key to lock
   * @param owner The owner of the lock
   * @param ttl The time to live of the lock in milliseconds. Null means no expiration
   *
   * @returns True if the lock was acquired, false otherwise
   */
  save(key: string, owner: string, ttl: number | null): Promise<boolean>

  /**
   * Delete the lock from the store if it is owned by the owner
   * Otherwise throws a E_LOCK_NOT_OWNED error
   *
   * @param key The key to delete
   * @param owner The owner of the lock
   */
  delete(key: string, owner: string): Promise<void>

  /**
   * Force delete the lock from the store. No check is made on the owner
   */
  forceRelease(key: string): Promise<void>

  /**
   * Check if the lock exists
   */
  exists(key: string): Promise<boolean>

  /**
   * Extend the lock expiration. Throws an error if the lock is not owned by the owner
   * Duration is in milliseconds
   */
  extend(key: string, owner: string, duration: number): Promise<void>

  /**
   * Disconnect the store from the underlying storage ( when applicable )
   */
  disconnect(): Promise<void>
}
