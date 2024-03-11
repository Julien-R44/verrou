import knex from 'knex'
import { test } from '@japa/runner'

import { setupTeardownHooks } from './helpers.js'
import { KnexStore } from '../../../src/drivers/knex.js'
import { registerStoreTestSuite } from '../../../src/test_suite.js'
import { POSTGRES_CREDENTIALS } from '../../../test_helpers/index.js'

const db = knex({ client: 'pg', connection: POSTGRES_CREDENTIALS })

test.group('Postgres Driver', (group) => {
  setupTeardownHooks(db, group)
  registerStoreTestSuite({
    test,
    store: KnexStore,
    config: { dialect: 'pg', connection: db },
  })
})
