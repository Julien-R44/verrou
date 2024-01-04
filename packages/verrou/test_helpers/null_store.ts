import type { LockStore } from '../src/types/main.js'

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

  async forceDelete(_key: string): Promise<void> {
    return
  }

  async extend(_key: string, _owner: string, _duration: number): Promise<void> {
    return
  }

  async disconnect() {
    return
  }
}
