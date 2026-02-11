/**
 * Triton RPC Integration
 *
 * Triton-optimized RPC for high-performance Solana access.
 */

import type { Connection } from '@solana/web3.js'

export interface TritonConfig {
  apiKey: string
  cluster?: 'mainnet-beta' | 'devnet'
}

export class TritonClient {
  private baseUrl: string

  constructor(config: TritonConfig) {
    const cluster = config.cluster ?? 'mainnet-beta'
    this.baseUrl = `https://${cluster === 'mainnet-beta' ? 'mainnet' : 'devnet'}.triton.one/${config.apiKey}`
  }

  /** Get the RPC endpoint URL for use with Connection */
  getEndpoint(): string {
    return this.baseUrl
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })

    if (!response.ok) throw new Error(`Triton RPC error: ${response.statusText}`)
    const data = await response.json()
    if (data.error) throw new Error(`Triton RPC error: ${data.error.message}`)
    return data.result
  }

  /** Get slot with optimized latency */
  async getSlot(): Promise<number> {
    return this.rpc('getSlot', [])
  }

  /** Get block height */
  async getBlockHeight(): Promise<number> {
    return this.rpc('getBlockHeight', [])
  }

  /** Get account info with Triton caching */
  async getAccountInfo(address: string): Promise<any> {
    return this.rpc('getAccountInfo', [address, { encoding: 'jsonParsed' }])
  }

  /** Get multiple accounts (batched) */
  async getMultipleAccounts(addresses: string[]): Promise<any[]> {
    return this.rpc('getMultipleAccounts', [addresses, { encoding: 'jsonParsed' }])
  }

  /** Check RPC health */
  async getHealth(): Promise<'ok' | string> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      return response.ok ? 'ok' : `unhealthy: ${response.status}`
    } catch (error) {
      return `error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}
