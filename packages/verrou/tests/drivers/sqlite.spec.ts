import knex from 'knex'
import { test } from '@japa/runner'

import { DatabaseStore } from '../../src/drivers/database.js'
import { registerStoreTestSuite } from '../../src/test_suite.js'
import { configureDatabaseGroupHooks } from '../../test_helpers/index.js'

const db = knex({
  client: 'sqlite3',
  connection: { filename: './cache.sqlite3' },
  useNullAsDefault: true,
})

test.group('Sqlite driver', (group) => {
  configureDatabaseGroupHooks(db, group)
  registerStoreTestSuite({
    test,
    config: { dialect: 'sqlite3', connection: db },
    store: DatabaseStore,
  })
})
