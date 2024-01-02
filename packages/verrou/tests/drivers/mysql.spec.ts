import knex from 'knex'
import { test } from '@japa/runner'

import { DatabaseStore } from '../../src/drivers/database.js'
import { configureDatabaseGroupHooks } from '../../test_helpers/index.js'
import { registerStoreTestSuite } from '../../test_helpers/driver_test_suite.js'

const db = knex({
  client: 'mysql2',
  connection: { user: 'root', password: 'root', database: 'mysql', port: 3306 },
})

test.group('Mysql driver', (group) => {
  configureDatabaseGroupHooks(db, group)
  registerStoreTestSuite({
    test,
    config: { dialect: 'mysql2', connection: db },
    store: DatabaseStore,
  })
})
