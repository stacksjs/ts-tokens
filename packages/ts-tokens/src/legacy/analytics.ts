/**
 * Legacy Collection Analytics
 *
 * Collection statistics, holder snapshots, and history.
 */

import type { TokenConfig } from '../types'
import type {
  CollectionStats,
  HolderEntry,
  CollectionHistoryEntry,
  ExportFormat,
} from '../types/legacy'

/**
 * Get collection statistics
 */
export async function getCollectionStats(
  collectionMint: string,
  config: TokenConfig
): Promise<CollectionStats> {
  const { createDASClient, _getAssetCollection } = await import('../indexer/das')
  const rpcUrl = config.rpcUrl || 'https://api.mainnet-beta.solana.com'
  const client = createDASClient(rpcUrl)

  // Get all assets in the collection
  const allAssets = []
  let page = 1
  const limit = 1000

  while (true) {
    const result = await client.getAssetsByGroup('collection', collectionMint, { page, limit })
    allAssets.push(...result.items)

    if (result.items.length < limit) break
    page++
  }

  // Calculate stats
  const owners = new Set<string>()
  let listedItems = 0

  for (const asset of allAssets) {
    owners.add(asset.ownership.owner)
    if (asset.ownership.delegated) {
      listedItems++
    }
  }

  return {
    totalItems: allAssets.length,
    uniqueHolders: owners.size,
    listedItems,
  }
}

/**
 * Get holder snapshot for a collection
 */
export async function getHolderSnapshot(
  collectionMint: string,
  config: TokenConfig
): Promise<HolderEntry[]> {
  const { createDASClient } = await import('../indexer/das')
  const rpcUrl = config.rpcUrl || 'https://api.mainnet-beta.solana.com'
  const client = createDASClient(rpcUrl)

  // Paginate through all assets
  const holderMap = new Map<string, string[]>()
  let page = 1
  const limit = 1000

  while (true) {
    const result = await client.getAssetsByGroup('collection', collectionMint, { page, limit })

    for (const asset of result.items) {
      const owner = asset.ownership.owner
      const existing = holderMap.get(owner) || []
      existing.push(asset.id)
      holderMap.set(owner, existing)
    }

    if (result.items.length < limit) break
    page++
  }

  // Convert to array and sort by count descending
  const entries: HolderEntry[] = Array.from(holderMap.entries())
    .map(([owner, mints]) => ({
      owner,
      mints,
      count: mints.length,
    }))
    .sort((a, b) => b.count - a.count)

  return entries
}

/**
 * Get collection transaction history
 */
export async function getCollectionHistory(
  collectionMint: string,
  config: TokenConfig,
  limit: number = 50
): Promise<CollectionHistoryEntry[]> {
  const { getNFTHistory } = await import('../nft/query')

  const history = await getNFTHistory(collectionMint, config, limit)

  return history.map(entry => ({
    signature: entry.signature,
    slot: entry.slot,
    blockTime: entry.blockTime,
    type: entry.type,
  }))
}

/**
 * Export collection data to a specified format
 */
export async function exportCollectionData(
  collectionMint: string,
  format: ExportFormat,
  config: TokenConfig
): Promise<string> {
  const { exportToJSON, exportHoldersToCSV, exportToMetaplexFormat } = await import('./export')
  const { ExportFormat: EF } = await import('../types/legacy')

  const stats = await getCollectionStats(collectionMint, config)
  const holders = await getHolderSnapshot(collectionMint, config)

  const data = {
    collection: collectionMint,
    stats,
    holders,
  }

  switch (format) {
    case EF.JSON:
      return exportToJSON(data)
    case EF.CSV:
      return exportHoldersToCSV(holders)
    case EF.Metaplex:
      return exportToMetaplexFormat(data)
    default:
      return exportToJSON(data)
  }
}
