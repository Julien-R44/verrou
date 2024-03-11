import pg from 'pg'
import { test } from '@japa/runner'
import { Kysely, PostgresDialect } from 'kysely'

import { setupTeardownHooks } from './helpers.js'
import { KyselyStore } from '../../../src/drivers/kysely.js'
import { registerStoreTestSuite } from '../../../src/test_suite.js'
import { POSTGRES_CREDENTIALS } from '../../../test_helpers/index.js'

const db = new Kysely<any>({
  dialect: new PostgresDialect({ pool: new pg.Pool(POSTGRES_CREDENTIALS) }),
})

test.group('Kysely | Postgres Driver', (group) => {
  setupTeardownHooks(group, db)
  registerStoreTestSuite({
    test,
    store: KyselyStore,
    config: { connection: db },
  })
})
