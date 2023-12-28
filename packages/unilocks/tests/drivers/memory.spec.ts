import { Redis } from 'ioredis'
import { test } from '@japa/runner'

import { MemoryMutexProvider, RedisMutexProvider } from '../../src/index.js'
import { REDIS_CREDENTIALS, registerDriverTestSuite } from '../../test_helpers/index.js'

registerDriverTestSuite({
  test,
  config: undefined,
  name: 'Memory Driver',
  mutexProvider: MemoryMutexProvider,
})

const ioredis = new Redis(REDIS_CREDENTIALS)
registerDriverTestSuite({
  test,
  name: 'Redis Driver',
  config: { connection: ioredis },
  mutexProvider: RedisMutexProvider,
  configureGroup(group) {
    group.each.teardown(async () => {
      await ioredis.flushall()
    })

    group.teardown(async () => {
      await ioredis.quit()
    })
  },
})
