import { Redis } from 'ioredis'
import { test } from '@japa/runner'

import { RedisStore } from '../../src/drivers/redis.js'
import { REDIS_CREDENTIALS } from '../../test_helpers/index.js'
import { registerStoreTestSuite } from '../../src/test_suite.js'

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

  test('null ttl', async ({ assert }) => {
    const store = new RedisStore({ connection: ioredis })
    await store.save('foo', 'bar', null)

    const ttl = await ioredis.ttl('foo')
    assert.deepEqual(ttl, -1)
  })
})
