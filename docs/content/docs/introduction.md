---
summary: Verrou is a locking library for managing locks in a Node.js application.
---

# Introduction

Verrou is a library for managing locks in a Node.js application.

- 🔒 Easy usage
- 🔄 Multiple drivers (Redis, Postgres, MySQL, Sqlite, In-Memory and others)
- 📦 Multiple database adapters ( Knex, Kysely... )
- 🔑 Customizable named locks
- 🌐 Consistent API across all drivers
- 🧪 Easy testing by switching to an in-memory driver
- 🔨 Easily extensible with your own drivers

---


:::codegroup

```ts
// title: Configuration
import { Verrou } from '@verrou/core'
import { redisStore } from '@verrou/core/drivers/redis'
import { memoryStore } from '@verrou/core/drivers/memory'

const verrou = new Verrou({
  default: 'redis',
  drivers: {
    redis: { driver: redisStore() },
    memory: { driver: memoryStore() }
  }
})
```

```ts
// title: Manual lock
import { Verrou } from '@verrou/core'

const lock = verrou.createLock('my-resource')
const acquired = await lock.acquire()

try {
  await doSomething()
} finally {
  await lock.release()
}
```

```ts
// title: Automatic lock
const lock = verrou.createLock('my-resource')

await lock.run(async () => {
  await doSomething()
}) // Lock is automatically released
```
:::

## Why Verrou ? 

Main advantage of Verrou is that it provides a consistent API across all drivers. This means that you can switch from one driver to another without having to change your code. It also means you can switch to an in-memory in your test environment, making tests faster and easier to setup (no infrastructure or anything fancy to setup).

Having a consistent API also means that you don't have to learn a new API when switching from one driver to another. Today, in the node ecosystem, we have different npm packages to manage locks, but they all have differents APIs and behaviors.

But having a consistent API doesn't mean having a less powerful API. Verrou provides every features you would expect from a locking library, and even more.

## Why I would need a locking library ?

Well, locks is a very common pattern in software development. It is used to prevent multiple processes or concurrent code from accessing a shared resource at the same time. It probably sounds a bit abstract, so let's take a concrete example.

Let's say you are writing code for a banking system. You have a function that transfer money from one account to another. We gonna implement it very naively, and then we will see what can go wrong.

```ts
router.get('/transfer', () => {
  const fromAccount = getAccountFromDb(request.input('from'))
  const toAccount = getAccountFromDb(request.input('to'))

  fromAccount.balance -= request.input('amount')
  toAccount.balance += request.input('amount')

  await fromAccount.save()
  await toAccount.save()
})
```

Okay cool. It works when we are trying it locally. But imagine something. What if two users try to transfer money to the same account at the same time ? 

Let's consider the following scenario :
- User A wants to transfer 100$ to Account C
- User B also wants to transfer 100$ to Account C
- Account C has a balance of 1000$

What will happen if both request are almost simultaneously executed ?

1. User A's request reads the balance of Account C : **We get 1000$**
2. Concurrently, User B's request also reads the balance of Account C: **We also get 1000$ since User A's request hasn't been fully executed yet**
3. User A's request adds 100$ to Account C's balance : **Account C now has 1100$**
4. Almost simultaneously, User B's request does the same. But remember, we stored the balance of Account C in a variable, and we added 100$ to it. So we also get **1000$ + 100$ = 1100$**.

See the problem ? That means, Account C will end up with 1100$ instead of 1200$. And even worse, User A and User B have been debited 100$ each, but only 100$ has been credited to Account C.

As a result, we lost 100$ somewhere. And that's not good. This is what we also call a **race condition**.

---

They are multiple ways to solve this problem. But let's use a lock here. By adding a lock, we are preventing concurrent requests from accessing the same piece of code at the same time :

```ts
router.get('/transfer', () => {
  // Other requests will wait just here until the lock is released
  await verrou.createLock('transfer').run(async () => {
    const fromAccount = getAccountFromDb(request.input('from'))
    const toAccount = getAccountFromDb(request.input('to'))

    fromAccount.balance -= request.input('amount')
    toAccount.balance += request.input('amount')

    await fromAccount.save()
    await toAccount.save()
  }) // Lock is automatically released after the callback is executed
})
```

Now, if two users are calling the same endpoint at the same time, the second one will have to wait for the first one to finish before being able to execute the code. This way, we are sure that the balance will be correct.

## Sponsor

If you like this project, [please consider supporting it by sponsoring it](https://github.com/sponsors/Julien-R44/). It will help a lot to maintain and improve it. Thanks a lot !
