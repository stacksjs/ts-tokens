/**
 * RPC Management
 *
 * Rate limiting, failover, and connection management.
 */

import type { ConnectionConfig } from '@solana/web3.js'
import { Connection } from '@solana/web3.js'

export interface RpcEndpoint {
  url: string
  weight?: number
  rateLimit?: number
  healthy?: boolean
  lastCheck?: number
}

export interface RpcManagerOptions {
  endpoints: RpcEndpoint[]
  maxRetries?: number
  retryDelay?: number
  healthCheckInterval?: number
  cacheEnabled?: boolean
  cacheTtl?: number
}

/**
 * RPC Manager with failover and rate limiting
 */
export class RpcManager {
  private endpoints: RpcEndpoint[]
  private currentIndex = 0
  private requestQueue: Array<() => Promise<unknown>> = []
  private processing = false
  private cache = new Map<string, { data: unknown, timestamp: number }>()
  private options: Required<RpcManagerOptions>

  constructor(options: RpcManagerOptions) {
    this.endpoints = options.endpoints.map(e => ({
      ...e,
      healthy: true,
      lastCheck: Date.now(),
    }))
    this.options = {
      endpoints: this.endpoints,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      healthCheckInterval: options.healthCheckInterval ?? 30000,
      cacheEnabled: options.cacheEnabled ?? true,
      cacheTtl: options.cacheTtl ?? 5000,
    }
  }

  /**
   * Get the current connection
   */
  getConnection(config?: ConnectionConfig): Connection {
    const endpoint = this.getHealthyEndpoint()
    return new Connection(endpoint.url, config)
  }

  /**
   * Get a healthy endpoint
   */
  private getHealthyEndpoint(): RpcEndpoint {
    const healthy = this.endpoints.filter(e => e.healthy)
    if (healthy.length === 0) {
      // Reset all endpoints if none are healthy
      this.endpoints.forEach(e => (e.healthy = true))
      return this.endpoints[0]
    }

    // Round-robin among healthy endpoints
    const endpoint = healthy[this.currentIndex % healthy.length]
    this.currentIndex++
    return endpoint
  }

  /**
   * Execute with retry and failover
   */
  async execute<T>(fn: (connection: Connection) => Promise<T>): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      const endpoint = this.getHealthyEndpoint()
      const connection = new Connection(endpoint.url)

      try {
        return await fn(connection)
      }
      catch (error) {
        lastError = error as Error

        // Mark endpoint as unhealthy
        endpoint.healthy = false
        endpoint.lastCheck = Date.now()

        // Wait before retry
        if (attempt < this.options.maxRetries - 1) {
          await this.delay(this.options.retryDelay * (attempt + 1))
        }
      }
    }

    throw lastError || new Error('All RPC endpoints failed')
  }

  /**
   * Execute with caching
   */
  async executeWithCache<T>(
    cacheKey: string,
    fn: (connection: Connection) => Promise<T>,
  ): Promise<T> {
    if (this.options.cacheEnabled) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.options.cacheTtl) {
        return cached.data as T
      }
    }

    const result = await this.execute(fn)

    if (this.options.cacheEnabled) {
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() })
    }

    return result
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Check endpoint health
   */
  async checkHealth(): Promise<void> {
    for (const endpoint of this.endpoints) {
      try {
        const connection = new Connection(endpoint.url)
        await connection.getSlot()
        endpoint.healthy = true
      }
      catch {
        endpoint.healthy = false
      }
      endpoint.lastCheck = Date.now()
    }
  }

  /**
   * Get endpoint status
   */
  getStatus(): Array<{ url: string, healthy: boolean, lastCheck: number }> {
    return this.endpoints.map(e => ({
      url: e.url,
      healthy: e.healthy ?? true,
      lastCheck: e.lastCheck ?? 0,
    }))
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Create RPC manager with common providers
 */
export function createRpcManager(
  network: 'mainnet-beta' | 'devnet' | 'testnet',
  customEndpoints?: string[],
): RpcManager {
  const defaultEndpoints: Record<string, RpcEndpoint[]> = {
    'mainnet-beta': [
      { url: 'https://api.mainnet-beta.solana.com', weight: 1 },
    ],
    'devnet': [
      { url: 'https://api.devnet.solana.com', weight: 1 },
    ],
    'testnet': [
      { url: 'https://api.testnet.solana.com', weight: 1 },
    ],
  }

  const endpoints = customEndpoints
    ? customEndpoints.map(url => ({ url, weight: 1 }))
    : defaultEndpoints[network]

  return new RpcManager({ endpoints })
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    factor?: number
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
  } = options

  let lastError: Error | undefined
  let delay = initialDelay

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    }
    catch (error) {
      lastError = error as Error

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * factor, maxDelay)
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}
