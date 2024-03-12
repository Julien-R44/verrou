import type { Knex } from 'knex'
import type { Group } from '@japa/runner/core'

import { KnexAdapter } from '../../../src/drivers/knex.js'
import type { KnexStoreOptions } from '../../../src/types/drivers.js'
import { DatabaseStore } from '../../../src/drivers/database.js'

export function setupTeardownHooks(db: Knex, group: Group) {
  group.each.teardown(async () => {
    const exists = await db.schema.hasTable('verrou')
    if (!exists) return

    await db.table('verrou').truncate()
  })

  group.teardown(async () => {
    const exists = await db.schema.hasTable('verrou')
    if (exists) await db.schema.dropTable('verrou')

    await db.destroy()
  })
}

export function createKnexStore(options: KnexStoreOptions) {
  const adapter = new KnexAdapter(options.connection)
  return new DatabaseStore(adapter, options)
}
