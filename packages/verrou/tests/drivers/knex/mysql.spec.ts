import knex from 'knex'
import { test } from '@japa/runner'

import { createKnexStore, setupTeardownHooks } from './helpers.js'
import { MYSQL_CREDENTIALS } from '../../../test_helpers/index.js'
import { registerStoreTestSuite } from '../../../src/test_suite.js'

const db = knex({ client: 'mysql2', connection: MYSQL_CREDENTIALS })

test.group('Mysql driver', (group) => {
  setupTeardownHooks(db, group)
  registerStoreTestSuite({
    test,
    createStore: () => createKnexStore({ connection: db }),
  })
})
