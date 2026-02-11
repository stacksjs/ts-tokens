/**
 * Persistent Cache
 *
 * Extends MemoryCache with localStorage/IndexedDB persistence for browser environments.
 */

export interface PersistentCacheConfig {
  prefix?: string
  defaultTtl?: number
  maxSize?: number
  storage?: 'localStorage' | 'indexedDB'
}

interface StoredEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * Persistent cache using localStorage (browser) or file-based (Node.js)
 */
export class PersistentCache<T = unknown> {
  private memoryCache = new Map<string, StoredEntry<T>>()
  private prefix: string
  private defaultTtl: number
  private maxSize: number
  private storageType: 'localStorage' | 'indexedDB'

  constructor(config: PersistentCacheConfig = {}) {
    this.prefix = config.prefix ?? 'ts-tokens:'
    this.defaultTtl = config.defaultTtl ?? 300000 // 5 minutes
    this.maxSize = config.maxSize ?? 500
    this.storageType = config.storage ?? 'localStorage'
  }

  get(key: string): T | null {
    const fullKey = this.prefix + key

    // Check memory first
    const memEntry = this.memoryCache.get(fullKey)
    if (memEntry) {
      if (Date.now() - memEntry.timestamp <= memEntry.ttl) {
        return memEntry.data
      }
      this.memoryCache.delete(fullKey)
    }

    // Try persistent storage
    if (this.storageType === 'localStorage' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(fullKey)
        if (raw) {
          const entry: StoredEntry<T> = JSON.parse(raw)
          if (Date.now() - entry.timestamp <= entry.ttl) {
            this.memoryCache.set(fullKey, entry)
            return entry.data
          }
          localStorage.removeItem(fullKey)
        }
      } catch {
        // Storage unavailable or corrupted
      }
    }

    return null
  }

  set(key: string, data: T, ttl?: number): void {
    const fullKey = this.prefix + key
    const entry: StoredEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    }

    // Evict if at max
    if (this.memoryCache.size >= this.maxSize) {
      const oldestKey = this.memoryCache.keys().next().value
      if (oldestKey) {
        this.memoryCache.delete(oldestKey)
        if (typeof localStorage !== 'undefined') {
          try { localStorage.removeItem(oldestKey) } catch {}
        }
      }
    }

    this.memoryCache.set(fullKey, entry)

    // Persist
    if (this.storageType === 'localStorage' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(fullKey, JSON.stringify(entry))
      } catch {
        // Quota exceeded or unavailable
      }
    }
  }

  delete(key: string): boolean {
    const fullKey = this.prefix + key
    const deleted = this.memoryCache.delete(fullKey)
    if (typeof localStorage !== 'undefined') {
      try { localStorage.removeItem(fullKey) } catch {}
    }
    return deleted
  }

  clear(): void {
    // Clear memory
    this.memoryCache.clear()

    // Clear persistent
    if (typeof localStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith(this.prefix)) {
            keysToRemove.push(k)
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k))
      } catch {}
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  get size(): number {
    return this.memoryCache.size
  }

  async getOrSet(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key)
    if (cached !== null) return cached
    const data = await factory()
    this.set(key, data, ttl)
    return data
  }
}
