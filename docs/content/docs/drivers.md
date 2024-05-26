---
summary: The locks stores drivers available to use with Verrou
---

# Drivers

Verrou supports multiple drivers to store the locks. No matter which driver you use, the API will always be the same.

## Redis

You will need to install `ioredis` to use this driver.

The Redis driver can be used with many different providers:

- Upstash
- Vercel KV
- DragonFly
- Redis Cluster

The driver uses the [ioredis](https://github.com/redis/ioredis) library under the hood. So all possible ioredis configurations are assignable when creating the driver. Feel free to look at their documentation for more details.

:::codegroup

```ts
// title: Verrou API
import { Redis } from 'ioredis'
import { Verrou } from '@verrou/core'
import { redisStore } from '@verrou/core/drivers/redis'

const redis = new Redis({ host: 'localhost', port: 6379 })
const verrou = new Verrou({
  default: 'redis',
  stores: {
    redis: {
      driver: redisStore({ connection: redis }),
    },
  },
})
```

```ts
// title: LockFactory API
import { Verrou, LockFactory } from '@verrou/core'
import { RedisStore } from '@verrou/core/drivers/redis'

const redis = new Redis({ host: 'localhost', port: 6379 })
const store = new RedisStore({ connection: redis })

const lockFactory = new LockFactory(store)
```

:::

### Options

| Option       | Description              | Default |
|--------------|--------------------------|---------|
| `connection` | An instance of `ioredis` | N/A     |

### Implementation details

Note that the Redis store does **not** use the redlock algorithm. It uses a simple `setnx` as described in the [Redis documentation](https://redis.io/commands/set/). We may introduce a redlock strategy in the future.

## Memory

The memory store is a simple in-memory store, so don't use it in a multi-server environment.

Use [async-mutex](https://www.npmjs.com/package/async-mutex) under the hood.

:::codegroup

```ts
// title: Verrou API
import { Verrou } from '@verrou/core'
import { memoryStore } from '@verrou/core/drivers/memory'

const verrou = new Verrou({
  default: 'memory',
  stores: {
    memory: { driver: memoryStore() },
  },
})
```

```ts
// title: LockFactory API
import { Verrou, LockFactory } from '@verrou/core'
import { MemoryStore } from '@verrou/core/drivers/memory'

const store = new MemoryStore()
const lockFactory = new LockFactory(store)
```

:::

## DynamoDB

DynamoDB is also supported by Verrou. You will need to install `@aws-sdk/client-dynamodb` to use this driver.

:::codegroup

```ts
// title: Verrou API
import { Verrou } from '@verrou/core'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { dynamodbStore } from '@verrou/core/drivers/dynamodb'

const dynamoClient = new DynamoDBClient(/* ... */)
const verrou = new Verrou({
  default: 'dynamo',
  stores: {
    dynamo: {
      driver: dynamodbStore({
        connection: dynamoClient,
        // Name of the table where the locks will be stored
        table: { name: 'locks' },
      }),
    },
  },
})
```

```ts
// title: LockFactory API
import { Verrou, LockFactory } from '@verrou/core'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBStore } from '@verrou/core/drivers/dynamodb'

const dynamoClient = new DynamoDBClient(/* ... */)
const store = new DynamoDBStore({
  connection: dynamoClient,
  // Name of the table where the locks will be stored
  table: {
    name: 'locks',
  },
})

const lockFactory = new LockFactory(store)
```

:::

The DynamoDB table will be automatically created if it does not exist. Otherwise, you can create it manually and specify the name of the table in the options.

### Options

| Option       | Description                                                 | Default |
|--------------|-------------------------------------------------------------|---------|
| `table.name` | The name of the table that will be used to store the cache. | `cache` |
| `connection` | An instance of `DynamoDBClient`                             | N/A     |

## Databases

We offer several drivers to use a database as the locks store. The database store should use an adapter for your database. Out of the box, we support [Knex](https://knexjs.org/) and [Kysely](https://kysely.dev/) to interact with the database. Knex and Kysely support many databases : SQLite, MySQL, PostgreSQL, MSSQL, Oracle, and more.

:::note

Note that you can easily create your own adapter by implementing the `DatabaseAdapter` interface if you are using another library not supported by Verrou. See the [documentation](/docs/custom-lock-store#create-an-adapter-for-the-databasestore) for more details.

:::

All Database drivers accept the following common options:

| Option            | Description                                                        | Default  |
|-------------------|--------------------------------------------------------------------|----------|
| `tableName`       | The name of the table that will be used to store the locks.        | `verrou` |
| `autoCreateTable` | If the table should be automatically created if it does not exist. | `true`   |

### Knex

You must provide a Knex instance to use the Knex driver. Feel free to check the [Knex documentation](https://knexjs.org/) for more details about the configuration. Knex support many databases : SQLite, MySQL, PostgreSQL, MSSQL, Oracle, and more.

:::codegroup

```ts
// title: Verrou API
import knex from 'knex'
import { Verrou } from '@verrou/core'
import { knexStore } from '@verrou/core/drivers/knex'

const db = knex({ client: 'mysql2', connection: MYSQL_CREDENTIALS })

const verrou = new Verrou({
  default: 'sqlite',
  stores: {
    sqlite: { driver: knexStore({ connection: db }) },
  },
})
```

```ts
// title: LockFactory API
import knex from 'knex'
import { Verrou, LockFactory } from '@verrou/core'
import { KnexAdapter } from '@verrou/core/drivers/knex'
import { DatabaseStore } from '@verrou/core/drivers/database'

const db = knex({ client: 'mysql2', connection: MYSQL_CREDENTIALS })
const store = new DatabaseStore(new KnexAdapter(db))
const lockFactory = new LockFactory(store)
```

:::

### Kysely

You must provide a Kysely instance to use the Kysely driver. Feel free to check the [Kysely documentation](https://kysely.dev/) for more details about the configuration. Kysely support the following databases : SQLite, MySQL, PostgreSQL and MSSQL.

:::codegroup

```ts
// title: Verrou API
import { Kysely } from 'kysely'
import { Verrou } from '@verrou/core'
import { kyselyStore } from '@verrou/core/drivers/kysely'

const db = new Kysely<Database>({ dialect })

const verrou = new Verrou({
  default: 'kysely',
  stores: {
    kysely: { driver: kyselyStore({ connection: db }) },
  },
})
```

```ts
// title: LockFactory API
import { Kysely } from 'kysely'
import { Verrou, LockFactory } from '@verrou/core'
import { KyselyAdapter } from '@verrou/core/drivers/kysely'
import { DatabaseStore } from '@verrou/core/drivers/database'

const db = new Kysely<Database>({ dialect })
const store = new DatabaseStore(new KyselyAdapter(db))
const lockFactory = new LockFactory(store)
```

:::

### Implementation details

The database drivers use the same strategy as Laravel's Locks. The strategy is fairly simple : Just insert a row and rely on the database primary key constraint to prevent duplicates. If the insert fails, it means the lock already exists. This is briefly explained by Aaron Francis in [this article](https://aaronfrancis.com/2021/the-exceeding-cleverness-of-laravels-database-locks).
