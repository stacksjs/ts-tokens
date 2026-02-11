/**
 * Compressed NFT Query Functions
 *
 * DAS (Digital Asset Standard) API integration for querying compressed NFTs.
 */

import type { TokenConfig } from '../../types'
import { createConnection } from '../../drivers/solana/connection'

/**
 * DAS API asset representation
 */
export interface DASAsset {
  id: string
  interface: string
  content: {
    json_uri: string
    metadata: {
      name: string
      symbol: string
      description?: string
    }
    files?: Array<{
      uri: string
      mime: string
    }>
    links?: Record<string, string>
  }
  authorities: Array<{
    address: string
    scopes: string[]
  }>
  compression: {
    eligible: boolean
    compressed: boolean
    data_hash: string
    creator_hash: string
    asset_hash: string
    tree: string
    seq: number
    leaf_id: number
  }
  grouping: Array<{
    group_key: string
    group_value: string
  }>
  royalty: {
    royalty_model: string
    target: string | null
    percent: number
    basis_points: number
    primary_sale_happened: boolean
    locked: boolean
  }
  creators: Array<{
    address: string
    share: number
    verified: boolean
  }>
  ownership: {
    frozen: boolean
    delegated: boolean
    delegate: string | null
    ownership_model: string
    owner: string
  }
}

/**
 * DAS API response for paginated results
 */
export interface DASResponse {
  total: number
  limit: number
  page: number
  items: DASAsset[]
}

/**
 * Make a DAS API call via the RPC endpoint
 */
async function dasApiCall(
  rpcUrl: string,
  method: string,
  params: Record<string, unknown>
): Promise<any> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`DAS API request failed: ${response.statusText}`)
  }

  const json = await response.json()

  if (json.error) {
    throw new Error(`DAS API error: ${json.error.message || JSON.stringify(json.error)}`)
  }

  return json.result
}

/**
 * Get compressed NFTs owned by a specific wallet
 *
 * Requires a DAS-compatible RPC endpoint (e.g., Helius, Triton).
 */
export async function getCompressedNFTsByOwner(
  owner: string,
  config: TokenConfig,
  options?: { page?: number; limit?: number }
): Promise<DASResponse> {
  const connection = createConnection(config)
  const rpcUrl = connection.rpcEndpoint

  return dasApiCall(rpcUrl, 'getAssetsByOwner', {
    ownerAddress: owner,
    page: options?.page ?? 1,
    limit: options?.limit ?? 1000,
    displayOptions: {
      showCollectionMetadata: true,
    },
  })
}

/**
 * Get compressed NFTs in a specific Merkle tree
 *
 * Requires a DAS-compatible RPC endpoint (e.g., Helius, Triton).
 */
export async function getCompressedNFTsByTree(
  tree: string,
  config: TokenConfig,
  options?: { page?: number; limit?: number }
): Promise<DASResponse> {
  const connection = createConnection(config)
  const rpcUrl = connection.rpcEndpoint

  return dasApiCall(rpcUrl, 'getAssetsByGroup', {
    groupKey: 'collection',
    groupValue: tree,
    page: options?.page ?? 1,
    limit: options?.limit ?? 1000,
    displayOptions: {
      showCollectionMetadata: true,
    },
  })
}
