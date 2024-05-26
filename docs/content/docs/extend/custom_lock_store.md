---
summary: Learn how to create a custom lock driver for Verrou
---

# Create a custom lock driver

Extending Verrou with your own cache driver is easy. What you need is a class that implements the `LockStore` interface accessible from `@verrou/core/types`. The interface is defined as follows:

```ts
interface LockStore {
  save(key: string, owner: string, ttl: number | undefined): Promise<boolean>
  delete(key: string, owner: string): Promise<void>
  exists(key: string): Promise<boolean>
  extend(key: string, owner: string, duration: number): Promise<void>
}
```

Feel free to take a look at [the existing drivers](https://github.com/Julien-R44/verrou/tree/develop/src/drivers) implementations for inspiration. 

Once you defined your driver, you can create a factory function that will be used by Verrou to create instances of your driver at runtime. The factory function must be something like this:

```ts
import type { CreateDriverResult } from '@verrou/core/types'

export function myStore(config: MyStoreOptions): CreateDriverResult<MyStoreOptions> {
  return { config, factory: () => new MyDriver(config) }
}
```

Finally, you can use your driver when creating a new instance of Verrou:

```ts
import { Verrou } from '@verrou/core'
import { myStore } from './my_store.js'

const verrou = new Verrou({
  default: 'myStore',
  stores: {
    myStore: myStore({ /* Your driver options */ })
  }
})
```

## Create an adapter for the DatabaseStore

If your want to use a database to store your locks, you are not forced to create a full driver. You can leverage the adapter system available in the database store.

We only ship adapter for Kysely and Knex to interact with the database for now. If ever you want to use another library, you can create your own adapter by implementing the `DatabaseAdapter` interface accessible from `@verrou/core/types`. The interface is defined as follows:

```ts
export interface DatabaseAdapter {
  /**
   * Set the table name to store the locks
   */
  setTableName(tableName: string): void

  /**
   * Create the table to store the locks if it doesn't exist
   */
  createTableIfNotExists(): Promise<void>

  /**
   * Insert the given lock in the store
   */
  insertLock(lock: { key: string; owner: string; expiration: number | null }): Promise<void>

  /**
   * Acquire the lock by updating the owner and expiration date.
   *
   * The adapter should check if expiration date is in the past
   * and return the number of updated rows.
   */
  acquireLock(lock: { key: string; owner: string; expiration: number | null }): Promise<number>

  /**
   * Delete a lock from the store.
   *
   * If owner is provided, the lock should only be deleted if the owner matches.
   */
  deleteLock(key: string, owner?: string): Promise<void>

  /**
   * Extend the expiration date of the lock by the given
   * duration ( Date.now() + duration ).
   *
   * The owner must match.
   */
  extendLock(key: string, owner: string, duration: number): Promise<number>

  /**
   * Returns the current owner and expiration date of the lock
   */
  getLock(key: string): Promise<{ owner: string; expiration: number | null } | undefined>
}
```

You can take a look at the code of the [Kysely adapter](https://github.com/Julien-R44/verrou/blob/main/packages/verrou/src/drivers/kysely.ts#L22) or the [Knex adapter](https://github.com/Julien-R44/verrou/blob/main/packages/verrou/src/drivers/kysely.ts#L22) for inspiration.

Once you defined your adapter, you can create your own store that use the DatabaseStore and your adapter:

```ts
export class PrismaAdapter implements DatabaseAdapter {
  // ...
}

import { DatabaseStore } from '@verrou/core/drivers/database'

export function prismaStore(config: PrismaOptions) {
  return {
    config,
    factory: () => {
      const adapter = new PrismaAdapter(config.connection)
      return new DatabaseStore(adapter, config)
    },
  }
}
```

## Tests

If you want to test your driver and its compliance, Verrou is shipped with a test suite for [Japa](https://japa.dev/docs) that you can use. Note that you will also need to have `@japa/assert` installed. Then, you can use it like this:

```ts
// title: tests/my_store.spec.ts
import { test } from '@japa/runner'
import { MyStore } from '../src/my_store.js'
import { registerStoreTestSuite } from '@verrou/core/test_suite'

test.group('My Store', (group) => {
  registerStoreTestSuite({
    test,
    createStore: () => new MyStore()
  })
})
```

Then just run your tests as usual with Japa.
