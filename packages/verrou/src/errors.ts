import { createError } from '@poppinss/utils'

/**
 * Thrown when the lock is not acquired in the allotted time
 */
export const E_LOCK_TIMEOUT = createError(
  `Lock was not acquired in the allotted time`,
  'E_LOCK_TIMEOUT',
)

/**
 * Thrown when user tries to update/release/extend a lock that is not acquired by them
 */
export const E_LOCK_NOT_OWNED = createError(
  'Looks like you are trying to update a lock that is not acquired by you',
  'E_LOCK_NOT_OWNED',
)

/**
 * Thrown when the underlying store throws an error while saving/deleting/reading a lock
 */
export const E_LOCK_STORAGE_ERROR = createError<[{ message: string }]>(
  'Lock storage error: %s',
  'E_LOCK_STORAGE_ERROR',
)

/**
 * Thrown when user tries to acquire a lock that is already acquired by someone else
 */
export const E_LOCK_ALREADY_ACQUIRED = createError(
  'Lock is already acquired',
  'E_LOCK_ALREDY_ACQUIRED',
)
