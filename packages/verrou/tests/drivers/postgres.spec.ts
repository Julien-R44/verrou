import knex from 'knex'
import { test } from '@japa/runner'

import { DatabaseStore } from '../../src/drivers/database.js'
import { configureDatabaseGroupHooks } from '../../test_helpers/index.js'
import { registerStoreTestSuite } from '../../test_helpers/driver_test_suite.js'

const db = knex({
  client: 'pg',
  connection: { user: 'postgres', password: 'postgres' },
})

test.group('Postgres Driver', (group) => {
  configureDatabaseGroupHooks(db, group)
  registerStoreTestSuite({
    test,
    store: DatabaseStore,
    config: { dialect: 'pg', connection: db },
  })
})
