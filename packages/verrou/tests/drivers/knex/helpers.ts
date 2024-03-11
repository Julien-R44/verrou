import type { Knex } from 'knex'
import type { Group } from '@japa/runner/core'

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
