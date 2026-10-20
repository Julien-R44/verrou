import { resolveDuration } from './helpers.js'
import { E_LOCK_NOT_OWNED, E_SHUTDOWN } from './errors.js'
import type { LockStore, ShutdownOptions } from './types/main.js'

type HeldLock = {
  owner: string
  expiresAt?: number
  timer?: NodeJS.Timeout
}

/**
 * Tracks leases and running callbacks for a single factory.
 */
export class LockLifecycle implements LockStore {
  #store: LockStore
  #controller = new AbortController()
  #held = new Map<string, HeldLock>()
  #pending = new Map<string, Promise<unknown>>()
  #runs = new Set<Promise<void>>()
  #shutdown?: Promise<void>
  #releasing = false

  constructor(store: LockStore) {
    this.#store = store
  }

  get signal(): AbortSignal {
    return this.#controller.signal
  }

  startRun() {
    this.signal.throwIfAborted()
    let finish!: () => void
    const run = new Promise<void>((resolve) => {
      finish = resolve
    })
    this.#runs.add(run)

    return () => {
      this.#runs.delete(run)
      finish()
    }
  }

  async #track<T>(key: string, operation: () => Promise<T>): Promise<T> {
    // Keep store mutations and lease tracking in the same order for each key.
    const previous = this.#pending.get(key)
    const pending = previous ? previous.catch(() => {}).then(operation) : operation()
    this.#pending.set(key, pending)
    try {
      return await pending
    } finally {
      if (this.#pending.get(key) === pending) this.#pending.delete(key)
    }
  }

  #untrack(key: string, owner?: string) {
    const held = this.#held.get(key)
    if (!held || (owner !== undefined && held.owner !== owner)) return
    clearTimeout(held.timer)
    this.#held.delete(key)
  }

  #expire(key: string, held: HeldLock) {
    clearTimeout(held.timer)
    if (held.expiresAt === undefined) return

    const remaining = held.expiresAt - Date.now()
    if (remaining < 0) {
      this.#untrack(key, held.owner)
      return
    }

    // Node timers cannot exceed 2^31 - 1 milliseconds.
    held.timer = setTimeout(() => this.#expire(key, held), Math.min(remaining + 1, 2_147_483_647))
    held.timer.unref()
  }

  async save(key: string, owner: string, ttl: number | null) {
    this.signal.throwIfAborted()
    return this.#track(key, async () => {
      this.signal.throwIfAborted()
      const acquired = await this.#store.save(key, owner, ttl)
      if (acquired) {
        this.#untrack(key)
        const held = { owner, expiresAt: ttl ? Date.now() + ttl : undefined }
        this.#held.set(key, held)
        this.#expire(key, held)
      }

      // A save already sent to the store can finish after shutdown starts.
      // Keep its lease tracked for cleanup, but never hand it to the caller.
      this.signal.throwIfAborted()
      return acquired
    })
  }

  async delete(key: string, owner: string) {
    const afterShutdown = this.signal.aborted
    return this.#track(key, async () => {
      const held = this.#held.get(key)
      // A timed-out callback can reach its finally block after shutdown released it.
      if (afterShutdown && (!held || held.owner !== owner)) return
      try {
        await this.#store.delete(key, owner)
        this.#untrack(key, owner)
      } catch (error) {
        if (error instanceof E_LOCK_NOT_OWNED) this.#untrack(key, owner)
        throw error
      }
    })
  }

  async forceDelete(key: string) {
    return this.#track(key, async () => {
      await this.#store.forceDelete(key)
      this.#untrack(key)
    })
  }

  async extend(key: string, owner: string, duration: number) {
    if (this.#releasing) throw new E_SHUTDOWN()
    return this.#track(key, async () => {
      const held = this.#held.get(key)
      if (held?.owner === owner) clearTimeout(held.timer)
      try {
        await this.#store.extend(key, owner, duration)
      } catch (error) {
        if (error instanceof E_LOCK_NOT_OWNED) this.#untrack(key, owner)
        else if (held && this.#held.get(key) === held) this.#expire(key, held)
        throw error
      }

      this.#untrack(key)
      const extended = { owner, expiresAt: Date.now() + duration }
      this.#held.set(key, extended)
      this.#expire(key, extended)
    })
  }

  exists(key: string) {
    return this.#store.exists(key)
  }

  shutdown(options: ShutdownOptions = {}) {
    if (this.#shutdown) return this.#shutdown
    const timeout = resolveDuration(options.timeout)
    this.#shutdown = Promise.resolve().then(() => this.#drain(timeout))
    this.#controller.abort(new E_SHUTDOWN())
    return this.#shutdown
  }

  async #drain(timeout?: number) {
    let timer: NodeJS.Timeout | undefined
    try {
      const runs = Promise.all(this.#runs)
      if (timeout === undefined) {
        await runs
      } else if (timeout > 0) {
        await Promise.race([
          runs,
          new Promise<void>((resolve) => {
            timer = setTimeout(resolve, timeout)
          }),
        ])
      }
    } finally {
      clearTimeout(timer)
    }

    this.#runs.clear()
    this.#releasing = true
    // Do not leave a lease behind if a store operation was already in flight.
    await Promise.allSettled(this.#pending.values())
    const releases = await Promise.allSettled(
      [...this.#held].map(async ([key, held]) => {
        if (held.expiresAt !== undefined && held.expiresAt < Date.now()) {
          this.#untrack(key, held.owner)
          return
        }
        try {
          await this.delete(key, held.owner)
        } catch (error) {
          // The lease may have expired or been released by another process.
          if (!(error instanceof E_LOCK_NOT_OWNED)) throw error
        }
      }),
    )

    const errors = releases.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    )
    if (errors.length) throw new AggregateError(errors, 'Failed to release locks during shutdown')
  }
}
