import { Lock } from './lock.js'
import type { LockFactoryConfig, LockFactoryOptions, LockStore } from './types/main.js'

export class LockFactory {
  #config: LockFactoryConfig

  constructor(
    protected readonly store: LockStore,
    options: LockFactoryOptions = {},
  ) {
    this.#config = { retry: { attempts: null, delay: 250, ...options.retry } }
  }

  createLock(name: string) {
    return new Lock(name, this.store, this.#config)
  }
}
