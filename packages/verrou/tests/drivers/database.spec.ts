import knex from 'knex'
import { test } from '@japa/runner'

import { DatabaseStore } from '../../src/drivers/database.js'
import { configureDatabaseGroupHooks } from '../../test_helpers/index.js'

const db = knex({ client: 'pg', connection: { user: 'postgres', password: 'postgres' } })
test.group('Database Driver', (group) => {
  configureDatabaseGroupHooks(db, group)

  test('create table with specified tableName', async ({ assert, cleanup }) => {
    const store = new DatabaseStore({
      connection: db,
      dialect: 'pg',
      tableName: 'verrou_my_locks',
    })

    cleanup(async () => {
      await db.schema.dropTable('verrou_my_locks')
    })

    await store.save('foo', 'bar')

    const locks = await db.table('verrou_my_locks').select('*')
    assert.lengthOf(locks, 1)
  })
})
