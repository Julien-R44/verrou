import knex from 'knex'
import { test } from '@japa/runner'

import { setupTeardownHooks } from './helpers.js'
import { KnexStore } from '../../../src/drivers/knex.js'
import { MYSQL_CREDENTIALS } from '../../../test_helpers/index.js'
import { registerStoreTestSuite } from '../../../src/test_suite.js'

const db = knex({ client: 'mysql2', connection: MYSQL_CREDENTIALS })

test.group('Mysql driver', (group) => {
  setupTeardownHooks(db, group)
  registerStoreTestSuite({
    test,
    config: { dialect: 'mysql2', connection: db },
    store: KnexStore,
  })
})
