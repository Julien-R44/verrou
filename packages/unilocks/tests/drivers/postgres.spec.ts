import knex from 'knex'
import { test } from '@japa/runner'

import { DatabaseMutexProvider } from '../../src/drivers/database.js'
import { registerDriverTestSuite } from '../../test_helpers/index.js'

const db = knex({
  client: 'pg',
  connection: { user: 'postgres', password: 'postgres' },
})

registerDriverTestSuite({
  test,
  name: 'Postgres Driver',
  config: { dialect: 'pg', connection: db },
  mutexProvider: DatabaseMutexProvider,
  configureGroup(group) {
    group.each.teardown(async () => {
      await db.table('locks').truncate()
    })

    group.teardown(async () => {
      await db.schema.dropTable('locks')
      await db.destroy()
    })
  },
})
