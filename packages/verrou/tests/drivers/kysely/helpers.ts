import { sql, type Kysely } from 'kysely'
import type { Group } from '@japa/runner/core'

export function setupTeardownHooks(group: Group, db: Kysely<any>) {
  group.each.teardown(async () => {
    sql`DELETE FROM verrou`.execute(db).catch((err) => {
      console.error(err)
    })
  })

  group.teardown(async () => {
    await db.schema.dropTable('verrou').ifExists().execute()
    await db.destroy()
  })
}
