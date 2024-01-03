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
import { Verrou } from '@verrou/core'
import { redisStore } from '@verrou/core/drivers/redis'

const verrou = new Verrou({
  default: 'redis',
  drivers: {
    redis: { 
      driver: redisStore({
        connection: { host: 'localhost', port: 6379 }
      })
    },
  }
})
```

```ts
// title: LockFactory API
import { Verrou, LockFactory } from '@verrou/core'
import { redisStore } from '@verrou/core/drivers/redis'

const store = redisStore({
  connection: { host: 'localhost', port: 6379 }
})

const lockFactory = new LockFactory(store)
```

:::

It is also possible to directly pass an Ioredis instance to reuse a connection.

```ts
import { Redis } from 'ioredis'
import { Verrou } from '@verrou/core'
import { redisStore } from '@verrou/core/drivers/redis'

const ioredis = new Redis()

const verrou = new Verrou({
  default: 'redis',
  drivers: {
    redis: { driver: redisStore({ connection: ioredis }) },
  }
})
```

### Options

| Option | Description | Default |
| --- | --- | --- |
| `connection` | The connection options to use to connect to Redis or an instance of `ioredis` | N/A |

### Implementation details

Note that the Redis store does **not** use the redlock algorithm. It uses a simple `setnx` as described in the [Redis documentation](https://redis.io/commands/setnx/). We may introduce a redlock strategy in the future.

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
  drivers: {
    memory: { driver: memoryStore() },
  }
})
```

```ts
// title: LockFactory API
import { Verrou, LockFactory } from '@verrou/core'
import { memoryStore } from '@verrou/core/drivers/memory'

const store = memoryStore()
const lockFactory = new LockFactory(store)
```

:::

## DynamoDB

DynamoDB is also supported by Verrou. You will need to install `@aws-sdk/client-dynamodb` to use this driver.

:::codegroup

```ts
// title: Verrou API
import { Verrou } from '@verrou/core'
import { dynamodbStore } from '@verrou/core/drivers/dynamodb'

const verrou = new Verrou({
  default: 'dynamo',
  stores: {
    dynamo: {
      driver: dynamodbStore({
        endpoint: '...',
        region: 'eu-west-3',
        table: {
          // Name of the table where the locks will be stored
          name: 'locks' 
        },

        // Credentials to use to connect to DynamoDB
        credentials: {
          accessKeyId: '...',
          secretAccessKey: '...'
        }
      })
    }
  }
})
```

```ts
// title: LockFactory API
import { Verrou, LockFactory } from '@verrou/core'
import { dynamodbStore } from '@verrou/core/drivers/dynamodb'

const store = dynamodbStore({
  endpoint: '...',
  region: 'eu-west-3',
  table: {
    // Name of the table where the locks will be stored
    name: 'locks' 
  },

  // Credentials to use to connect to DynamoDB
  credentials: {
    accessKeyId: '...',
    secretAccessKey: '...'
  }
})

const lockFactory = new LockFactory(store)

```
:::

The DynamoDB table will be automatically created if it does not exists. Otherwise, you can create it manually and specify the name of the table in the options.

### Options

| Option | Description | Default |
| --- | --- | --- |
| `table.name` | The name of the table that will be used to store the cache. | `cache` |
| `credentials` | The credentials to use to connect to DynamoDB. | N/A |
| `endpoint` | The endpoint to use to connect to DynamoDB. | N/A |
| `region` | The region to use to connect to DynamoDB. | N/A |

## Databases

We offer several drivers to use a database as the locks store. Under the hood, we use [Knex](https://knexjs.org/). So all Knex options are available, feel free to check out the documentation.

All SQL drivers accept the following options:

| Option | Description | Default |
| --- | --- | --- |
| `tableName` | The name of the table that will be used to store the locks. | `verrou` |
| `autoCreateTable` | If the table should be automatically created if it does not exist. | `true` |
| `connection` | The connection options to use to connect to the database or an instance of `knex`. | N/A |

### PostgreSQL

You will need to install `pg` to use this driver.

:::codegroup

```ts
// title: Verrou API
import { Verrou } from '@verrou/core'
import { databaseStore } from '@verrou/core/drivers/database'

const verrou = new Verrou({
  default: 'pg',
  stores: {
    pg: {
      driver: databaseStore({
        dialect: 'pg',
        connection: {
          user: 'root',
          password: 'root',
          database: 'postgres',
          port: 5432 
        }
      })
    }
  }
})
```

```ts
// title: LockFactory API
import { Verrou, LockFactory } from '@verrou/core'
import { databaseStore } from '@verrou/core/drivers/database'

const store = databaseStore({
  dialect: 'pg',
  connection: {
    user: 'root',
    password: 'root',
    database: 'postgres',
    port: 5432 
  }
})
const lockFactory = new LockFactory(store)
```

:::

### MySQL

You will need to install `mysql2` to use this driver.

:::codegroup

```ts
// title: Verrou API
import { Verrou } from '@verrou/core'
import { databaseStore } from '@verrou/core/drivers/database'

const verrou = new Verrou({
  default: 'mysql',
  stores: {
    mysql: {
      driver: databaseStore({
        dialect: 'mysql',
        connection: {
          user: 'root', 
          password: 'root', 
          database: 'mysql', 
          port: 3306
        }
      })
    }
  }
})
```

```ts
// title: LockFactory API
import { Verrou, LockFactory } from '@verrou/core'
import { databaseStore } from '@verrou/core/drivers/database'

const store = databaseStore({
  dialect: 'mysql',
  connection: {
    user: 'root',
    password: 'root',
    database: 'mysql',
    port: 3306
  }
})

const lockFactory = new LockFactory(store)
```

:::

### SQLite ( better-sqlite3 )

You will need to install `better-sqlite3` to use this driver.

:::codegroup

```ts
// title: Verrou API
import { Verrou } from '@verrou/core'
import { databaseStore } from '@verrou/core/drivers/database'

const verrou = new Verrou({
  default: 'sqlite',
  stores: {
    sqlite: {
      driver: databaseStore({
        dialect: 'better-sqlite3',
        connection: { filename: 'cache.sqlite3' }
      })
    }
  }
})
```

```ts
// title: LockFactory API
import { Verrou, LockFactory } from '@verrou/core'
import { databaseStore } from '@verrou/core/drivers/database'

const store = databaseStore({
  dialect: 'better-sqlite3',
  connection: { filename: 'cache.sqlite3' }
})

const lockFactory = new LockFactory(store)
```

:::


### SQLite ( sqlite3 )

You will need to install `sqlite3` to use this driver.

:::codegroup

```ts
// title: Verrou API
import { Verrou } from '@verrou/core'
import { databaseStore } from '@verrou/core/drivers/database'

const verrou = new Verrou({
  default: 'sqlite',
  stores: {
    sqlite: {
      driver: databaseStore({
        connection: { filename: 'cache.sqlite3' }
      })
    }
  }
})
```

```ts
// title: LockFactory API
import { Verrou, LockFactory } from '@verrou/core'
import { databaseStore } from '@verrou/core/drivers/database'

const store = databaseStore({
  dialect: 'sqlite',
  connection: { filename: 'cache.sqlite3' }
})

const lockFactory = new LockFactory(store)
```

:::

### Implementation details

The database drivers use the same strategy as Laravel's Locks. The strategy is fairly simple : Just insert a row and rely on the database primary key constraint to prevent duplicates. If the insert fails, it means the lock already exists. This is briefly explained by Aaron Francis in [this article](https://aaronfrancis.com/2021/the-exceeding-cleverness-of-laravels-database-locks).
