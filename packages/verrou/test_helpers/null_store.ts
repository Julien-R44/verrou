import type { Duration, LockStore } from '../src/types/main.js'

export class NullStore implements LockStore {
  async save(_key: string): Promise<boolean> {
    return true
  }

  async delete(_key: string): Promise<void> {
    return
  }

  async exists(_key: string): Promise<boolean> {
    return true
  }

  async forceRelease(_key: string): Promise<void> {
    return
  }

  async extend(_key: string, _duration: Duration): Promise<void> {
    return
  }

  async disconnect() {
    return
  }
}
