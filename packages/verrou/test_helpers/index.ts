import type { Knex } from 'knex'
import type { Group } from '@japa/runner/core'

export const BASE_URL = new URL('./tmp/', import.meta.url)

export const REDIS_CREDENTIALS = {
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT),
}

export function configureDatabaseGroupHooks(db: Knex, group: Group) {
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
