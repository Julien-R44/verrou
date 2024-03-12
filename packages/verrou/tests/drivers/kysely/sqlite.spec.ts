import { test } from '@japa/runner'
import * as SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'

import { registerStoreTestSuite } from '../../../src/test_suite.js'
import { createKyselyStore, setupTeardownHooks } from './helpers.js'

const db = new Kysely<any>({
  dialect: new SqliteDialect({
    database: new SQLite.default('./cache.sqlite3'),
  }),
})

test.group('Kysely | Sqlite Driver', (group) => {
  setupTeardownHooks(group, db)
  registerStoreTestSuite({
    test,
    createStore: () => createKyselyStore({ connection: db }),
  })
})
