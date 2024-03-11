import knex from 'knex'
import { test } from '@japa/runner'

import { setupTeardownHooks } from './helpers.js'
import { KnexStore } from '../../../src/drivers/knex.js'

const db = knex({ client: 'pg', connection: { user: 'postgres', password: 'postgres' } })
test.group('Database Driver', (group) => {
  setupTeardownHooks(db, group)

  test('create table with specified tableName', async ({ assert, cleanup }) => {
    const store = new KnexStore({
      connection: db,
      dialect: 'pg',
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
    new KnexStore({ connection: db, dialect: 'pg', autoCreateTable: false })

    const hasTable = await db.schema.hasTable('verrou')
    assert.isFalse(hasTable)
  })

  test('null ttl', async ({ assert }) => {
    const store = new KnexStore({ connection: db, dialect: 'pg' })

    await store.save('foo', 'bar', null)

    const locks = await db.table('verrou').select('*')

    assert.lengthOf(locks, 1)
    assert.isUndefined(locks[0].ttl)
  })
})
