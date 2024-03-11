import { test } from '@japa/runner'
import { createPool } from 'mysql2'
import { Kysely, MysqlDialect } from 'kysely'

import { setupTeardownHooks } from './helpers.js'
import { KyselyStore } from '../../../src/drivers/kysely.js'
import { MYSQL_CREDENTIALS } from '../../../test_helpers/index.js'
import { registerStoreTestSuite } from '../../../src/test_suite.js'

const db = new Kysely<any>({
  dialect: new MysqlDialect({ pool: createPool(MYSQL_CREDENTIALS) }),
})

test.group('Kysely | Mysql driver', (group) => {
  setupTeardownHooks(group, db)
  registerStoreTestSuite({
    test,
    config: { connection: db },
    store: KyselyStore,
  })
})
