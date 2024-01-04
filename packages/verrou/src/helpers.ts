import string from '@poppinss/utils/string'

import type { Duration } from './types/main.js'

/**
 * Resolve a Duration to a number in milliseconds
 */
export function resolveDuration(duration?: Duration, defaultValue: Duration = 30_000) {
  if (typeof duration === 'number') return duration
  if (duration === null) return undefined

  if (duration === undefined) {
    if (typeof defaultValue === 'number') return defaultValue
    if (typeof defaultValue === 'string') return string.milliseconds.parse(defaultValue)

    return undefined
  }

  return string.milliseconds.parse(duration)
}
