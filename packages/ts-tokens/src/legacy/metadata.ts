/**
 * Legacy Collection & NFT Metadata Facades
 *
 * Unified metadata read/write operations wrapping existing NFT module functions.
 */

import type { TokenConfig, TransactionResult, TransactionOptions, NFTMetadata } from '../types'
import type { LegacyNFTItem, GetNFTsOptions, PaginatedNFTs, ProgressCallback } from '../types/legacy'

/**
 * Get collection metadata (on-chain + off-chain)
 */
// eslint-disable-next-line no-unused-vars
export async function getCollectionMetadata(
  collectionMint: string,
  config: TokenConfig
): Promise<{
  onChain: NFTMetadata
  offChain: Record<string, unknown> | null
}> {
  const { getNFTMetadata, fetchOffChainMetadata } = await import('../nft/metadata')

  const onChain = await getNFTMetadata(collectionMint, config)
  if (!onChain) {
    throw new Error(`Collection metadata not found: ${collectionMint}`)
  }

  const offChain = await fetchOffChainMetadata(onChain.uri)

  return { onChain, offChain }
}

/**
 * Update collection metadata
 */
export async function updateCollectionMetadata(
  collectionMint: string,
  updates: {
    name?: string
    symbol?: string
    uri?: string
    sellerFeeBasisPoints?: number
    newUpdateAuthority?: string
    isMutable?: boolean
  },
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { updateCollection } = await import('../nft/collection')

  return updateCollection(
    { collectionMint, ...updates },
    config,
    options
  )
}

/**
 * Update collection URI only
 */
export async function updateCollectionUri(
  collectionMint: string,
  uri: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  return updateCollectionMetadata(collectionMint, { uri }, config, options)
}

/**
 * Update collection royalty
 */
export async function updateCollectionRoyalty(
  collectionMint: string,
  sellerFeeBasisPoints: number,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  return updateCollectionMetadata(
    collectionMint,
    { sellerFeeBasisPoints },
    config,
    options
  )
}

/**
 * Get NFTs in a collection
 *
 * Uses DAS API when available, falls back to on-chain query.
 */
export async function getNFTsInCollection(
  collectionMint: string,
  config: TokenConfig,
  options: GetNFTsOptions = {}
): Promise<PaginatedNFTs> {
  const { useDAS = true, page = 1, limit = 50 } = options

  if (useDAS) {
    try {
      const { createDASClient, getAssetCollection } = await import('../indexer/das')
      const rpcUrl = config.rpcUrl || 'https://api.mainnet-beta.solana.com'
      const client = createDASClient(rpcUrl)

      const result = await client.getAssetsByGroup('collection', collectionMint, { page, limit })

      const items: LegacyNFTItem[] = result.items.map(asset => ({
        mint: asset.id,
        name: asset.content.metadata.name,
        symbol: asset.content.metadata.symbol,
        uri: asset.content.json_uri,
        owner: asset.ownership.owner,
        compressed: asset.compression?.compressed ?? false,
        collection: getAssetCollection(asset) ?? undefined,
        collectionVerified: true,
      }))

      return { items, total: result.total, page, limit }
    } catch {
      // Fall back to on-chain query
    }
  }

  const { getNFTsByCollection } = await import('../nft/query')
  const nfts = await getNFTsByCollection(collectionMint, config, limit)

  const items: LegacyNFTItem[] = nfts.map(nft => ({
    mint: nft.mint,
    name: nft.name,
    symbol: nft.symbol,
    uri: nft.uri,
  }))

  return { items, total: items.length, page: 1, limit }
}

/**
 * Get NFT metadata (re-export)
 */
export async function getLegacyNFTMetadata(
  mint: string,
  config: TokenConfig
): Promise<NFTMetadata | null> {
  const { getNFTMetadata } = await import('../nft/metadata')
  return getNFTMetadata(mint, config)
}

/**
 * Update NFT metadata (re-export)
 */
export async function updateLegacyNFTMetadata(
  mint: string,
  updates: {
    name?: string
    symbol?: string
    uri?: string
    sellerFeeBasisPoints?: number
    creators?: Array<{ address: string; share: number }>
    primarySaleHappened?: boolean
    isMutable?: boolean
  },
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { updateNFTMetadata } = await import('../nft/metadata')
  return updateNFTMetadata(mint, updates, config, options)
}

/**
 * Update NFT URI only
 */
export async function updateNFTUri(
  mint: string,
  uri: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { updateNFTMetadata } = await import('../nft/metadata')
  return updateNFTMetadata(mint, { uri }, config, options)
}

/**
 * Batch update NFT metadata with optional transform function
 */
// eslint-disable-next-line no-unused-vars
export async function batchUpdateNFTMetadata(
  items: Array<{
    mint: string
    updates: {
      name?: string
      symbol?: string
      uri?: string
      sellerFeeBasisPoints?: number
    }
  }>,
  config: TokenConfig,
  options?: {
    batchSize?: number
    delayMs?: number
    onProgress?: ProgressCallback
    transform?: (item: { mint: string; updates: Record<string, unknown> }) => {
      mint: string
      updates: Record<string, unknown>
    }
  }
): Promise<{
  successful: number
  failed: number
  total: number
  signatures: string[]
  errors: Array<{ mint: string; error: string }>
}> {
  const { batchMetadataUpdate } = await import('../batch/metadata')

  const processedItems = options?.transform
    ? items.map(item => options.transform!(item as any) as any)
    : items

  return batchMetadataUpdate(
    {
      items: processedItems,
      batchSize: options?.batchSize,
      delayMs: options?.delayMs,
      onProgress: options?.onProgress,
    },
    config
  )
}
