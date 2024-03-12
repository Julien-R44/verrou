import { sql, type Kysely } from 'kysely'
import type { Group } from '@japa/runner/core'

import type { KyselyOptions } from '../../../src/types/drivers.js'
import { KyselyAdapter } from '../../../src/drivers/kysely.js'
import { DatabaseStore } from '../../../src/drivers/database.js'

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

export function createKyselyStore(options: KyselyOptions) {
  const adapter = new KyselyAdapter(options.connection)
  return new DatabaseStore(adapter, options)
}
