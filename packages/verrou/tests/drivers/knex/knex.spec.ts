import knex from 'knex'
import { test } from '@japa/runner'

import { createKnexStore, setupTeardownHooks } from './helpers.js'

const db = knex({ client: 'pg', connection: { user: 'postgres', password: 'postgres' } })
test.group('Database Driver', (group) => {
  setupTeardownHooks(db, group)

  test('create table with specified tableName', async ({ assert, cleanup }) => {
    const store = createKnexStore({
      connection: db,
      tableName: 'verrou_my_locks',
    })

    cleanup(async () => {
      await db.schema.dropTable('verrou_my_locks')
    })

    await store.save('foo', 'bar', 1000)

    const locks = await db.table('verrou_my_locks').select('*')
    assert.lengthOf(locks, 1)
  })

  test('doesnt create table if autoCreateTable is false', async ({ assert }) => {
    createKnexStore({ connection: db, autoCreateTable: false })

    const hasTable = await db.schema.hasTable('verrou')
    assert.isFalse(hasTable)
  })

  test('null ttl', async ({ assert }) => {
    const store = createKnexStore({ connection: db })

    await store.save('foo', 'bar', null)

    const locks = await db.table('verrou').select('*')

    assert.lengthOf(locks, 1)
    assert.isUndefined(locks[0].ttl)
  })
})
