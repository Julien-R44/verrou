import pg from 'pg'
import { test } from '@japa/runner'
import { Kysely, PostgresDialect } from 'kysely'

import { registerStoreTestSuite } from '../../../src/test_suite.js'
import { createKyselyStore, setupTeardownHooks } from './helpers.js'
import { POSTGRES_CREDENTIALS } from '../../../test_helpers/index.js'

const db = new Kysely<any>({
  dialect: new PostgresDialect({ pool: new pg.Pool(POSTGRES_CREDENTIALS) }),
})

test.group('Kysely | Postgres Driver', (group) => {
  setupTeardownHooks(group, db)
  registerStoreTestSuite({
    test,
    createStore: () => createKyselyStore({ connection: db }),
  })
})
