import knex from 'knex'
import { test } from '@japa/runner'

import { DatabaseMutexProvider } from '../../src/drivers/database.js'
import { registerDriverTestSuite } from '../../test_helpers/index.js'

const db = knex({
  client: 'mysql2',
  connection: {
    user: 'root',
    password: 'root',
    database: 'mysql',
    port: 3306,
  },
})

registerDriverTestSuite({
  test,
  name: 'Postgres Driver',
  config: { dialect: 'mysql2', connection: db },
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
