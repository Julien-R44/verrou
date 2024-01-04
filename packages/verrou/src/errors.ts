import { createError } from '@poppinss/utils'

export const E_LOCK_TIMEOUT = createError(
  `Lock was not acquired in the allotted time`,
  'E_LOCK_TIMEOUT',
)

export const E_LOCK_NOT_OWNED = createError(
  'Looks like you are trying to update a lock that is not acquired by you',
  'E_LOCK_NOT_OWNED',
)

export const E_LOCK_STORAGE_ERROR = createError<[{ message: string }]>(
  'Lock storage error: %s',
  'E_LOCK_STORAGE_ERROR',
)
