import { test } from '@japa/runner'
import * as SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'

import { setupTeardownHooks } from './helpers.js'
import { KyselyStore } from '../../../src/drivers/kysely.js'
import { registerStoreTestSuite } from '../../../src/test_suite.js'

const db = new Kysely<any>({
  dialect: new SqliteDialect({
    database: new SQLite.default('./cache.sqlite3'),
  }),
})

test.group('Kysely | Sqlite Driver', (group) => {
  setupTeardownHooks(group, db)
  registerStoreTestSuite({
    test,
    store: KyselyStore,
    config: { connection: db },
  })
})
