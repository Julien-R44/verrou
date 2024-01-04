---
summary: How to use Verrou, the Lock Manager for Node.js
---

# Usage

Verrou's API is very simple and fairly similar to other existing libraries.

## Creating a Lock instance

The very first step is to create a `Lock` instance. This is done by calling the `createLock` method on either the `Verrou` or `LockFactory` instance.

```ts
import { verrou } from './verrou.js'

const lock = verrou.createLock('my-resource', '1s')
```

The first argument is the resource/key to lock. This is an arbitrary string that will be used to identify the lock. The second argument is the duration of the lock. It can be a number of milliseconds, a string like `1s` or `1m` ( see [lukeed/ms documentation](https://github.com/lukeed/ms), or even `null` if you want to create a lock that never expires.

Note that the duration you are passing is the duration of the lease. This means that the lock will be automatically released after this duration. This is safe to always pass a duration, even if you are releasing the lock manually afterwards ( see below ). Having a duration will prevent the lock from being stuck forever if the process crashes before releasing it ( We call this a **Deadlock** ).

Also note, that creating a lock does not mean that you acquired it. You will need to acquire it first before being able to execute your critical code section.

## Managing locks

Once you have created a lock, you can acquire it multiples ways. Let's see them all.

### Manual lock

The first way is to manually acquire/release the lock. This is done by calling the `acquire` and `release` methods on the lock instance.

```ts
import { verrou } from './verrou.js'

// For demonstration purposes, we are creating a lock that 
// never expires automatically
const lock = verrou.createLock('my-resource', null)

// We gonna wait for the lock to be acquired
await lock.acquire()

// Do your critical code here
doSomething()

// Once you are done, release the lock.
await lock.release()
```

But we are still missing error handling. What if my `doSomething` method throws an error? The lock will never be released. To prevent this, always make sure to wrap your code with a try/catch/finaly block.

```ts
import { verrou } from './verrou.js'

const lock = verrou.createLock('my-resource', null)

try {
  await lock.acquire()

  // Do your critical code here
  doSomething()
} catch (error) {
  // Handle the error
} finally {
  // Release the lock
  await lock.release()
}
```

### Using the `run` method

The second way is to use the `run` method. As you see in the previous example, the manual way is a bit verbose. The `run` method is a shortcut that will acquire the lock, execute your code, and release the lock automatically.

```ts
import { verrou } from './verrou.js'

const lock = verrou.createLock('my-resource', '2s')
await lock.run(async () => {
  // Do your critical code here
  doSomething()
}) // Automatically release the lock after the callback is executed
```

What happens here ?

- We create a lock named `my-resource` that will be automatically released after 2 seconds ( if we don't release it manually before )
- We call the `run` method on our lock instance with a callback function. 
- The callback passed to the `run` method will be executed when the lock is acquired.
- Once the callback is executed, the lock will be released automatically.

As you can see, this is a bit more concise than the manual way.

### Acquiring a lock with a custom timeout/retry policy

The logic for acquiring a lock is simple : basically just try and try again until the lock is acquired. So you can specify some options to the `acquire` or `run` method to specify a timeout before acquiring the lock, or a maximum retry count.

```ts
import { verrou } from './verrou.js'

const lock = verrou.createLock('my-resource', '2s')

await lock.acquire({
  retry: {
    // Retry maximum 5 times before throwing an error
    attempts: 5,

    // Wait 100ms between each retry
    delay: 100,

    // Maximum wait time before throwing an error
    timeout: 1000
  }
})
```

In general, you will either use the `retry.attempts` or `retry.timeout` options.

### Handling errors

If ever you can't acquire a lock, an error will be thrown. You can catch it and handle it like this : 

```ts
import { errors } from '@verrou/core'

try {
  await lock.acquire()
} catch (error) {
  if (error instanceof errors.E_LOCK_TIMEOUT) {
    // Handle the error
  }
}

await lock.run(async () => {
  // Do your critical code here
  doSomething()
}).catch(error => {
  if (error instanceof errors.E_LOCK_TIMEOUT) {
    // Handle the error
  }
})
```

### Sharing a lock between multiple processes

As you have seen in the previous examples, you can release a lock by calling the `release` method on the lock instance. There is something important to note : **only the same `Lock` instance that acquired the lock can release it**. This means that you can't release a lock that was acquired by another process for example.

```ts
import { verrou } from './verrou.js'

const lock1 = verrou.createLock('my-resource', '2s')
const lock2 = verrou.createLock('my-resource', '2s')

await lock1.acquire()
await lock2.release() // This will throw an error E_LOCK_NOT_OWNER
```

So you may be wondering : how can I release a lock that was acquired by another process ? We got you covered. Let's take an example : We have a simple API that exposes a route for processing a payment. The payment is sent to a queue and processed by a worker ( another process ). Let's see how can do this. 

```ts
// title: app.ts
import { verrou } from './verrou.js'

router.get('/process-payment', async (req, res) => {
  const lock = verrou.createLock('my-resource', '2s')
  await lock.acquire()

  myQueue.dispatch('process-payment', { 
    paymentId: 123,
    lock: lock.serialize()
  })
})
```

So we dispatch a message to our queue with the lock owner. Now let's see how we can release the lock in our worker.

```ts
// title: worker.ts
import { verrou } from './verrou.js'

myQueue.on('process-payment', async ({ paymentId, lock }) => {
  // First we **restore** the lock with the lock owner
  const lock = verrou.restoreLock(lock)

  processPayment(paymentId)

  // Then we can release it
  await lock.release()
})
```

As you can see, we can restore a lock by calling the `restoreLock` method and passing the serialized lock. This will create a new `Lock` instance with the same resource and owner. Then we can release it.

Note that you can also use `lock.forceRelease()` to release a lock, no matter the owner.

### Refreshing a lock

As explained above, this is always a good idea to create an automatically expiring lock. But sometimes, you are either not sure how long your critical code will take to execute. So you may want to extend the lock while your code is executing. This is done by calling the `extend` method on the lock instance.

```ts
import { verrou } from './verrou.js'

const lock = verrou.createLock('my-resource', '10s')

await lock.acquire()
// ...
// Refresh the lock for the same duration ( 10s here )
await lock.extend() 
// ..
// Refresh the lock for 5 seconds
await lock.extend('5s') 
```

You may also use the `lock.isExpired()` or `lock.getRemainingTime()` methods to check if the lock is expired or get the remaining time before it expires.
