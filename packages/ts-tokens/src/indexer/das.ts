/**
 * DAS API Utilities
 *
 * Generic DAS API helpers that work with any DAS-compatible RPC.
 */

import type { PublicKey } from '@solana/web3.js'
import type { DASAsset, DASSearchOptions, DASSearchResult } from './types'

/**
 * DAS RPC client
 */
export class DASClient {
  private rpcUrl: string

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl
  }

  /**
   * Make DAS RPC request
   */
  private async request<T>(method: string, params: unknown): Promise<T> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'das',
        method,
        params,
      }),
    })

    if (!response.ok) {
      throw new Error(`DAS RPC error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`DAS RPC error: ${data.error.message}`)
    }

    return data.result
  }

  /**
   * Get asset by ID
   */
  async getAsset(id: string | PublicKey): Promise<DASAsset> {
    const assetId = typeof id === 'string' ? id : id.toBase58()
    return this.request('getAsset', { id: assetId })
  }

  /**
   * Get multiple assets
   */
  async getAssetBatch(ids: (string | PublicKey)[]): Promise<DASAsset[]> {
    const assetIds = ids.map(id => typeof id === 'string' ? id : id.toBase58())
    return this.request('getAssetBatch', { ids: assetIds })
  }

  /**
   * Get assets by owner
   */
  async getAssetsByOwner(
    owner: string | PublicKey,
    options: {
      page?: number
      limit?: number
      sortBy?: { sortBy: 'created' | 'updated', sortDirection: 'asc' | 'desc' }
      displayOptions?: { showFungible?: boolean, showNativeBalance?: boolean }
    } = {},
  ): Promise<DASSearchResult> {
    const ownerAddress = typeof owner === 'string' ? owner : owner.toBase58()
    return this.request('getAssetsByOwner', {
      ownerAddress,
      page: options.page ?? 1,
      limit: options.limit ?? 1000,
      sortBy: options.sortBy,
      displayOptions: options.displayOptions,
    })
  }

  /**
   * Get assets by group (collection)
   */
  async getAssetsByGroup(
    groupKey: 'collection',
    groupValue: string | PublicKey,
    options: { page?: number, limit?: number } = {},
  ): Promise<DASSearchResult> {
    const value = typeof groupValue === 'string' ? groupValue : groupValue.toBase58()
    return this.request('getAssetsByGroup', {
      groupKey,
      groupValue: value,
      page: options.page ?? 1,
      limit: options.limit ?? 1000,
    })
  }

  /**
   * Get assets by creator
   */
  async getAssetsByCreator(
    creator: string | PublicKey,
    options: { onlyVerified?: boolean, page?: number, limit?: number } = {},
  ): Promise<DASSearchResult> {
    const creatorAddress = typeof creator === 'string' ? creator : creator.toBase58()
    return this.request('getAssetsByCreator', {
      creatorAddress,
      onlyVerified: options.onlyVerified ?? true,
      page: options.page ?? 1,
      limit: options.limit ?? 1000,
    })
  }

  /**
   * Get assets by authority
   */
  async getAssetsByAuthority(
    authority: string | PublicKey,
    options: { page?: number, limit?: number } = {},
  ): Promise<DASSearchResult> {
    const authorityAddress = typeof authority === 'string' ? authority : authority.toBase58()
    return this.request('getAssetsByAuthority', {
      authorityAddress,
      page: options.page ?? 1,
      limit: options.limit ?? 1000,
    })
  }

  /**
   * Search assets
   */
  async searchAssets(options: DASSearchOptions): Promise<DASSearchResult> {
    return this.request('searchAssets', options)
  }

  /**
   * Get asset proof (for compressed NFTs)
   */
  async getAssetProof(id: string | PublicKey): Promise<{
    root: string
    proof: string[]
    node_index: number
    leaf: string
    tree_id: string
  }> {
    const assetId = typeof id === 'string' ? id : id.toBase58()
    return this.request('getAssetProof', { id: assetId })
  }

  /**
   * Get signatures for asset
   */
  async getSignaturesForAsset(
    id: string | PublicKey,
    options: { page?: number, limit?: number } = {},
  ): Promise<{ items: Array<{ signature: string, slot: number }> }> {
    const assetId = typeof id === 'string' ? id : id.toBase58()
    return this.request('getSignaturesForAsset', {
      id: assetId,
      page: options.page ?? 1,
      limit: options.limit ?? 1000,
    })
  }
}

/**
 * Create DAS client
 */
export function createDASClient(rpcUrl: string): DASClient {
  return new DASClient(rpcUrl)
}

/**
 * Get all NFTs owned by an address (paginated)
 */
export async function getAllNFTsByOwner(
  client: DASClient,
  owner: string | PublicKey,
  options: { onlyCompressed?: boolean } = {},
): Promise<DASAsset[]> {
  const allAssets: DASAsset[] = []
  let page = 1
  const limit = 1000

  while (true) {
    const result = await client.getAssetsByOwner(owner, { page, limit })
    allAssets.push(...result.items)

    if (result.items.length < limit) {
      break
    }

    page++
  }

  if (options.onlyCompressed) {
    return allAssets.filter(a => a.compression?.compressed)
  }

  return allAssets
}

/**
 * Get all NFTs in a collection (paginated)
 */
export async function getAllNFTsInCollection(
  client: DASClient,
  collection: string | PublicKey,
): Promise<DASAsset[]> {
  const allAssets: DASAsset[] = []
  let page = 1
  const limit = 1000

  while (true) {
    const result = await client.getAssetsByGroup('collection', collection, { page, limit })
    allAssets.push(...result.items)

    if (result.items.length < limit) {
      break
    }

    page++
  }

  return allAssets
}

/**
 * Check if asset is compressed
 */
export function isCompressedNFT(asset: DASAsset): boolean {
  return asset.compression?.compressed ?? false
}

/**
 * Get collection from asset
 */
export function getAssetCollection(asset: DASAsset): string | null {
  const collection = asset.grouping.find(g => g.group_key === 'collection')
  return collection?.group_value ?? null
}

/**
 * Format asset for display
 */
export function formatAsset(asset: DASAsset): string {
  const lines = [
    `Name: ${asset.content.metadata.name}`,
    `Symbol: ${asset.content.metadata.symbol}`,
    `ID: ${asset.id}`,
    `Owner: ${asset.ownership.owner}`,
    `Compressed: ${isCompressedNFT(asset) ? 'Yes' : 'No'}`,
    `Mutable: ${asset.mutable ? 'Yes' : 'No'}`,
    `Burnt: ${asset.burnt ? 'Yes' : 'No'}`,
  ]

  const collection = getAssetCollection(asset)
  if (collection) {
    lines.push(`Collection: ${collection}`)
  }

  if (asset.royalty.basis_points > 0) {
    lines.push(`Royalty: ${asset.royalty.basis_points / 100}%`)
  }

  return lines.join('\n')
}
