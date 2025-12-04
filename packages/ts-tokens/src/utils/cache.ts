/**
 * Caching Utilities
 *
 * In-memory and persistent caching for account data.
 */

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  defaultTtl?: number // milliseconds
  maxSize?: number
  persistent?: boolean
}

/**
 * In-memory cache with TTL support
 */
export class MemoryCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>()
  private config: Required<CacheConfig>

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTtl: config.defaultTtl ?? 30000, // 30 seconds
      maxSize: config.maxSize ?? 1000,
      persistent: config.persistent ?? false,
    }
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set a value in cache
   */
  set(key: string, data: T, ttl?: number): void {
    // Evict oldest entries if at max size
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTtl,
    })
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Get or set with factory function
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key)
    if (cached !== null) {
      return cached
    }

    const data = await factory()
    this.set(key, data, ttl)
    return data
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would track hits/misses for real implementation
    }
  }
}

/**
 * Account cache with type-specific TTLs
 */
export class AccountCache {
  private cache: MemoryCache

  // TTLs for different account types (in ms)
  private ttls = {
    mint: 60000, // 1 minute
    tokenAccount: 10000, // 10 seconds
    metadata: 300000, // 5 minutes
    candyMachine: 5000, // 5 seconds (changes frequently during mint)
    default: 30000,
  }

  constructor() {
    this.cache = new MemoryCache({ maxSize: 5000 })
  }

  /**
   * Cache a mint account
   */
  setMint(address: string, data: unknown): void {
    this.cache.set(`mint:${address}`, data, this.ttls.mint)
  }

  getMint(address: string): unknown | null {
    return this.cache.get(`mint:${address}`)
  }

  /**
   * Cache a token account
   */
  setTokenAccount(address: string, data: unknown): void {
    this.cache.set(`token:${address}`, data, this.ttls.tokenAccount)
  }

  getTokenAccount(address: string): unknown | null {
    return this.cache.get(`token:${address}`)
  }

  /**
   * Cache metadata
   */
  setMetadata(mint: string, data: unknown): void {
    this.cache.set(`metadata:${mint}`, data, this.ttls.metadata)
  }

  getMetadata(mint: string): unknown | null {
    return this.cache.get(`metadata:${mint}`)
  }

  /**
   * Cache Candy Machine
   */
  setCandyMachine(address: string, data: unknown): void {
    this.cache.set(`cm:${address}`, data, this.ttls.candyMachine)
  }

  getCandyMachine(address: string): unknown | null {
    return this.cache.get(`cm:${address}`)
  }

  /**
   * Invalidate all entries for a mint
   */
  invalidateMint(mint: string): void {
    this.cache.delete(`mint:${mint}`)
    this.cache.delete(`metadata:${mint}`)
    this.cache.invalidatePattern(new RegExp(`token:.*${mint}`))
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }
}

/**
 * Request deduplication
 */
export class RequestDeduplicator {
  private pending = new Map<string, Promise<unknown>>()

  /**
   * Deduplicate concurrent requests for the same key
   */
  async dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key)
    if (existing) {
      return existing as Promise<T>
    }

    const promise = factory().finally(() => {
      this.pending.delete(key)
    })

    this.pending.set(key, promise)
    return promise
  }

  /**
   * Get number of pending requests
   */
  get pendingCount(): number {
    return this.pending.size
  }
}

/**
 * Create cache key from multiple parts
 */
export function createCacheKey(...parts: (string | number | boolean)[]): string {
  return parts.join(':')
}

/**
 * Default cache instance
 */
export const defaultCache: AccountCache = new AccountCache()
export const defaultDeduplicator: RequestDeduplicator = new RequestDeduplicator()
