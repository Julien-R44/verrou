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

Once you defined you driver, you can create a factory function that will be used by Verrou to create instances of your driver at runtime. The factory function must be something like this:

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
    store: MyStore,
    config: {
      // Your driver options
    }
  })
})
```

Then just run your tests as usual with Japa.
