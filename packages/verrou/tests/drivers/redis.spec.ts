import { Redis } from 'ioredis'
import { test } from '@japa/runner'

import { RedisStore } from '../../src/drivers/redis.js'
import { REDIS_CREDENTIALS } from '../../test_helpers/index.js'
import { registerStoreTestSuite } from '../../test_helpers/driver_test_suite.js'

const ioredis = new Redis(REDIS_CREDENTIALS)

test.group('Redis Driver', (group) => {
  group.each.teardown(async () => {
    await ioredis.flushall()
  })

  group.teardown(async () => {
    await ioredis.quit()
  })

  registerStoreTestSuite({
    test,
    config: { connection: ioredis },
    store: RedisStore,
  })
})
