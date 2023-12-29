export type DialectName = 'pg' | 'mysql2' | 'better-sqlite3' | 'sqlite3'

export interface MutexLock {
  acquire(): Promise<void>
  release(): Promise<void>
  run<T>(callback: () => Promise<T>): Promise<T>
  isLocked(): Promise<boolean>
}

export interface MutexProvider {
  createLock(key: string, timeout?: number): MutexLock
}
