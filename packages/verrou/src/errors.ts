import { createError } from '@poppinss/utils/exception'

/**
 * Thrown when user tries to update/release/extend a lock that is not acquired by them
 */
export const E_LOCK_NOT_OWNED = createError(
  'Looks like you are trying to update or release a lock that is not acquired by you',
  'E_LOCK_NOT_OWNED',
)

/**
 * Thrown when the underlying store throws an error while saving/deleting/reading a lock
 */
export const E_LOCK_STORAGE_ERROR = createError<[{ message: string }]>(
  'Lock storage error: %s',
  'E_LOCK_STORAGE_ERROR',
)
