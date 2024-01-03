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
}

export interface LockFactoryConfig {
  retry: RetryConfig
}

export interface LockStore {
  /**
   * Save the lock in the store if not already locked
   */
  save(key: string, owner: string, ttl: number | null | undefined): Promise<boolean>

  /**
   * Delete the lock from the store
   */
  delete(key: string, owner: string): Promise<void>

  /**
   * Force delete the lock from the store
   */
  forceRelease(key: string): Promise<void>

  /**
   * Check if the lock exists
   */
  exists(key: string): Promise<boolean>

  /**
   * Extend the lock expiration
   */
  extend(key: string, duration: Duration): Promise<void>

  /**
   * Disconnect the store
   */
  disconnect(): Promise<void>
}
