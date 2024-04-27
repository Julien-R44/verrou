---
summary: Learn to plug in your own logger to Verrou
---

# Logging

In case you encounter any issues, or if you just want more visibility and information about what Verrou is doing, you can plug in a custom logger when you create an instance of Verrou.

Your logger must comply with the following interface:

```ts
export interface Logger {
  trace(msg: string | LogObject): void
  trace(obj: LogObject, msg: string): void

  debug(msg: string | LogObject): void
  debug(obj: LogObject, msg: string): void

  info(msg: string | LogObject): void
  info(obj: LogObject, msg: string): void

  warn(msg: string): void
  warn(obj: LogObject, msg: string): void

  error(msg: string): void
  error(obj: ErrorObject, msg: string): void

  fatal(msg: string): void
  fatal(obj: ErrorObject, msg: string): void

  child(childObj: LogObject): Logger
}
```

A compatible logger is, for example, [Pino](https://github.com/pinojs/pino), which is the de-facto logger to use for modern Node.js projects.

Next, when you create your Verrou instance, you can inject your logger. Example with Pino:

```ts
import { pino } from 'pino'

const logger = pino({
  level: 'trace',
  transport: { target: 'pino-pretty' },
})

const verrou = new Verrou({
  // ...
  logger,
})
```

Verrou will create a child logger with the label `pkg: "verrou"`, allowing you to filter easily on your end.

If using the `LockFactory` API, you can also do the same :

```ts
import { pino } from 'pino'
import { LockFactory } from '@verrou/core'
import { MemoryStore } from '@verrou/core/drivers/memory'

const logger = pino({
  level: 'trace',
  transport: { target: 'pino-pretty' },
})

const lockFactory = new LockFactory(new MemoryStore(), { logger })
```
