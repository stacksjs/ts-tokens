/**
 * Helius Integration
 *
 * Helius DAS API and enhanced RPC.
 */

import type {
  DASAsset,
  DASSearchOptions,
  DASSearchResult,
  TransactionHistoryItem,
  WebhookConfig,
} from './types'

/**
 * Helius client
 */
export class HeliusClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta') {
    this.apiKey = apiKey
    this.baseUrl = cluster === 'mainnet-beta'
      ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
      : `https://devnet.helius-rpc.com/?api-key=${apiKey}`
  }

  /**
   * Make RPC request
   */
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius',
        method,
        params,
      }),
    })

    if (!response.ok) {
      throw new Error(`Helius RPC error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`Helius RPC error: ${data.error.message}`)
    }

    return data.result
  }

  /**
   * Get asset by ID (DAS)
   */
  async getAsset(id: string): Promise<DASAsset> {
    return this.rpc('getAsset', [{ id }])
  }

  /**
   * Get assets by owner (DAS)
   */
  async getAssetsByOwner(
    owner: string,
    options: { page?: number, limit?: number, sortBy?: object, before?: string, after?: string } = {},
  ): Promise<DASSearchResult> {
    return this.rpc('getAssetsByOwner', [{
      ownerAddress: owner,
      page: options.page ?? 1,
      limit: options.limit ?? 1000,
      sortBy: options.sortBy,
      before: options.before,
      after: options.after,
    }])
  }

  /**
   * Get assets by group (collection)
   */
  async getAssetsByGroup(
    groupKey: string,
    groupValue: string,
    options: { page?: number, limit?: number, sortBy?: object } = {},
  ): Promise<DASSearchResult> {
    return this.rpc('getAssetsByGroup', [{
      groupKey,
      groupValue,
      page: options.page ?? 1,
      limit: options.limit ?? 1000,
      sortBy: options.sortBy,
    }])
  }

  /**
   * Get assets by creator
   */
  async getAssetsByCreator(
    creator: string,
    options: { onlyVerified?: boolean, page?: number, limit?: number } = {},
  ): Promise<DASSearchResult> {
    return this.rpc('getAssetsByCreator', [{
      creatorAddress: creator,
      onlyVerified: options.onlyVerified ?? true,
      page: options.page ?? 1,
      limit: options.limit ?? 1000,
    }])
  }

  /**
   * Search assets
   */
  async searchAssets(options: DASSearchOptions): Promise<DASSearchResult> {
    return this.rpc('searchAssets', [options])
  }

  /**
   * Get asset proof (for compressed NFTs)
   */
  async getAssetProof(id: string): Promise<{
    root: string
    proof: string[]
    node_index: number
    leaf: string
    tree_id: string
  }> {
    return this.rpc('getAssetProof', [{ id }])
  }

  /**
   * Get multiple asset proofs
   */
  async getAssetProofBatch(ids: string[]): Promise<Record<string, {
    root: string
    proof: string[]
    node_index: number
    leaf: string
    tree_id: string
  }>> {
    return this.rpc('getAssetProofBatch', [{ ids }])
  }

  /**
   * Get transaction history (enhanced)
   */
  async getTransactionHistory(
    address: string,
    options: { before?: string, until?: string, limit?: number, type?: string } = {},
  ): Promise<TransactionHistoryItem[]> {
    const apiUrl = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${this.apiKey}`

    const params = new URLSearchParams()
    if (options.before)
      params.set('before', options.before)
    if (options.until)
      params.set('until', options.until)
    if (options.limit)
      params.set('limit', options.limit.toString())
    if (options.type)
      params.set('type', options.type)

    const response = await fetch(`${apiUrl}&${params}`)

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Parse transaction (enhanced)
   */
  async parseTransaction(signature: string): Promise<TransactionHistoryItem> {
    const apiUrl = `https://api.helius.xyz/v0/transactions/?api-key=${this.apiKey}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: [signature] }),
    })

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data[0]
  }

  /**
   * Get NFT events
   */
  async getNFTEvents(
    accounts: string[],
    options: { types?: string[], startSlot?: number, endSlot?: number, limit?: number } = {},
  ): Promise<TransactionHistoryItem[]> {
    const apiUrl = `https://api.helius.xyz/v1/nft-events?api-key=${this.apiKey}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {
          accounts,
          types: options.types,
          startSlot: options.startSlot,
          endSlot: options.endSlot,
        },
        options: {
          limit: options.limit ?? 100,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.result
  }

  /**
   * Create webhook
   */
  async createWebhook(config: WebhookConfig): Promise<{ webhookID: string }> {
    const apiUrl = `https://api.helius.xyz/v0/webhooks?api-key=${this.apiKey}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const apiUrl = `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${this.apiKey}`

    const response = await fetch(apiUrl, { method: 'DELETE' })

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`)
    }
  }

  /**
   * Get all webhooks
   */
  async getWebhooks(): Promise<Array<WebhookConfig & { webhookID: string }>> {
    const apiUrl = `https://api.helius.xyz/v0/webhooks?api-key=${this.apiKey}`

    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get RPC URL for web3.js Connection
   */
  getRpcUrl(): string {
    return this.baseUrl
  }
}

/**
 * Create Helius client
 */
export function createHeliusClient(
  apiKey: string,
  cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta',
): HeliusClient {
  return new HeliusClient(apiKey, cluster)
}
