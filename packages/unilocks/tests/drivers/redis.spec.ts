import { Redis } from 'ioredis'
import { test } from '@japa/runner'

import { RedisMutexProvider } from '../../src/drivers/redis.js'
import { REDIS_CREDENTIALS, registerDriverTestSuite } from '../../test_helpers/index.js'

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
