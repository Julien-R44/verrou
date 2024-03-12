import knex from 'knex'
import { test } from '@japa/runner'

import { createKnexStore, setupTeardownHooks } from './helpers.js'
import { registerStoreTestSuite } from '../../../src/test_suite.js'

const db = knex({
  client: 'sqlite3',
  connection: { filename: './cache.sqlite3' },
  useNullAsDefault: true,
})

test.group('Sqlite driver', (group) => {
  setupTeardownHooks(db, group)
  registerStoreTestSuite({
    test,
    createStore: () => createKnexStore({ connection: db, dialect: 'sqlite3' }),
  })
})
