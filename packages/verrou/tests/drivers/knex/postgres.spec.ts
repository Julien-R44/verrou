import knex from 'knex'
import { test } from '@japa/runner'

import { createKnexStore, setupTeardownHooks } from './helpers.js'
import { registerStoreTestSuite } from '../../../src/test_suite.js'
import { POSTGRES_CREDENTIALS } from '../../../test_helpers/index.js'

const db = knex({ client: 'pg', connection: POSTGRES_CREDENTIALS })

test.group('Postgres Driver', (group) => {
  setupTeardownHooks(db, group)
  registerStoreTestSuite({
    test,
    createStore: () => createKnexStore({ connection: db }),
  })
})
