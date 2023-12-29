import { test } from '@japa/runner'

import { MemoryMutexProvider } from '../../src/drivers/memory.js'
import { registerDriverTestSuite } from '../../test_helpers/index.js'

registerDriverTestSuite({
  test,
  config: undefined,
  name: 'Memory Driver',
  mutexProvider: MemoryMutexProvider,
})
