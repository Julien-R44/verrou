import { test } from '@japa/runner'

import { MemoryStore } from '../../src/drivers/memory.js'
import { registerStoreTestSuite } from '../../src/test_suite.js'

test.group('Memory Store', () => {
  registerStoreTestSuite({
    test,
    config: undefined,
    store: MemoryStore,
  })
})
