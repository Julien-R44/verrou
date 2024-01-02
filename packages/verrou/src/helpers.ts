import string from '@poppinss/utils/string'

import type { Duration } from './types/main.js'

/**
 * Resolve a TTL value to a number in milliseconds
 */
export function resolveDuration(ttl?: Duration, defaultTtl: Duration = 30_000) {
  if (typeof ttl === 'number') return ttl
  if (ttl === null) return undefined

  if (ttl === undefined) {
    if (typeof defaultTtl === 'number') return defaultTtl
    if (typeof defaultTtl === 'string') return string.milliseconds.parse(defaultTtl)

    return undefined
  }

  return string.milliseconds.parse(ttl)
}
