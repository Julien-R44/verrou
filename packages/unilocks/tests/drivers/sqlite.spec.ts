import knex from 'knex'
import { test } from '@japa/runner'

import { DatabaseMutexProvider } from '../../src/drivers/database.js'
import { registerDriverTestSuite } from '../../test_helpers/index.js'

const db = knex({
  client: 'sqlite3',
  connection: { filename: './cache.sqlite3' },
  useNullAsDefault: true,
})

registerDriverTestSuite({
  test,
  name: 'Sqlite Driver',
  config: { dialect: 'sqlite3', connection: db },
  mutexProvider: DatabaseMutexProvider,
  configureGroup(group) {
    group.each.teardown(async () => {
      await db.table('locks').truncate()
    })

    group.teardown(async () => {
      await db.destroy()
    })
  },
})
