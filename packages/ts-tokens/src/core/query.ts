/**
 * Core Asset Queries
 *
 * Fetch Core asset and collection information via DAS API.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import type { CoreAsset, CoreCollection, CorePlugin } from '../types/core'
import { createConnection } from '../drivers/solana/connection'
import { MPL_CORE_PROGRAM_ID } from '../programs/mpl-core/types'

/**
 * Fetch a Core asset by address using DAS API
 */
export async function getCoreAsset(
  address: string,
  config: TokenConfig
): Promise<CoreAsset | null> {
  const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com'

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-core-asset',
        method: 'getAsset',
        params: { id: address },
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    if (data.error || !data.result) return null

    const asset = data.result
    return mapDASAssetToCore(asset)
  } catch {
    return null
  }
}

/**
 * Fetch a Core collection by address using DAS API
 */
export async function getCoreCollection(
  address: string,
  config: TokenConfig
): Promise<CoreCollection | null> {
  const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com'

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-core-collection',
        method: 'getAsset',
        params: { id: address },
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    if (data.error || !data.result) return null

    const result = data.result
    return {
      address,
      updateAuthority: result.authorities?.[0]?.address ?? '',
      name: result.content?.metadata?.name ?? '',
      uri: result.content?.json_uri ?? '',
      numMinted: result.grouping?.length ?? 0,
      currentSize: result.supply?.print_current_supply ?? 0,
      plugins: mapDASPlugins(result.plugins ?? []),
    }
  } catch {
    return null
  }
}

/**
 * Fetch all Core assets owned by an address
 */
export async function getCoreAssetsByOwner(
  owner: string,
  config: TokenConfig,
  options: { limit?: number; page?: number } = {}
): Promise<CoreAsset[]> {
  const { limit = 50, page = 1 } = options
  const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com'

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-core-assets-by-owner',
        method: 'searchAssets',
        params: {
          ownerAddress: owner,
          programId: MPL_CORE_PROGRAM_ID,
          page,
          limit,
        },
      }),
    })

    if (!response.ok) return []

    const data = await response.json()
    if (data.error || !data.result?.items) return []

    return data.result.items.map(mapDASAssetToCore).filter(Boolean) as CoreAsset[]
  } catch {
    return []
  }
}

/**
 * Fetch all Core assets in a collection
 */
export async function getCoreAssetsByCollection(
  collectionAddress: string,
  config: TokenConfig,
  options: { limit?: number; page?: number } = {}
): Promise<CoreAsset[]> {
  const { limit = 50, page = 1 } = options
  const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com'

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-core-assets-by-collection',
        method: 'searchAssets',
        params: {
          grouping: ['collection', collectionAddress],
          page,
          limit,
        },
      }),
    })

    if (!response.ok) return []

    const data = await response.json()
    if (data.error || !data.result?.items) return []

    return data.result.items.map(mapDASAssetToCore).filter(Boolean) as CoreAsset[]
  } catch {
    return []
  }
}

/**
 * Map a DAS API asset response to our CoreAsset type
 */
function mapDASAssetToCore(asset: any): CoreAsset | null {
  if (!asset) return null

  const collection = asset.grouping?.find((g: any) => g.group_key === 'collection')

  return {
    address: asset.id,
    owner: asset.ownership?.owner ?? '',
    updateAuthority: collection
      ? { type: 'Collection', address: collection.group_value }
      : (asset.authorities?.[0]?.address ?? ''),
    name: asset.content?.metadata?.name ?? '',
    uri: asset.content?.json_uri ?? '',
    plugins: mapDASPlugins(asset.plugins ?? []),
  }
}

/**
 * Map DAS plugin data to our CorePlugin types
 */
function mapDASPlugins(plugins: any[]): CorePlugin[] {
  const mapped: CorePlugin[] = []

  for (const plugin of plugins) {
    const type = plugin.type ?? plugin.plugin_type
    if (!type) continue

    switch (type) {
      case 'Royalties':
      case 'royalties':
        mapped.push({
          type: 'Royalties',
          basisPoints: plugin.data?.basis_points ?? plugin.basis_points ?? 0,
          creators: (plugin.data?.creators ?? plugin.creators ?? []).map((c: any) => ({
            address: c.address,
            percentage: c.percentage ?? c.share ?? 0,
          })),
          ruleSet: { type: 'None' },
        })
        break
      case 'FreezeDelegate':
      case 'freezeDelegate':
        mapped.push({
          type: 'FreezeDelegate',
          frozen: plugin.data?.frozen ?? plugin.frozen ?? false,
        })
        break
      case 'Attributes':
      case 'attributes':
        mapped.push({
          type: 'Attributes',
          attributeList: (plugin.data?.attribute_list ?? plugin.attribute_list ?? []).map((a: any) => ({
            key: a.key,
            value: a.value,
          })),
        })
        break
      case 'PermanentFreezeDelegate':
      case 'permanentFreezeDelegate':
        mapped.push({
          type: 'PermanentFreezeDelegate',
          frozen: plugin.data?.frozen ?? plugin.frozen ?? false,
        })
        break
      case 'TransferDelegate':
      case 'transferDelegate':
        mapped.push({ type: 'TransferDelegate' })
        break
      case 'BurnDelegate':
      case 'burnDelegate':
        mapped.push({ type: 'BurnDelegate' })
        break
      case 'ImmutableMetadata':
      case 'immutableMetadata':
        mapped.push({ type: 'ImmutableMetadata' })
        break
      case 'AddBlocker':
      case 'addBlocker':
        mapped.push({ type: 'AddBlocker' })
        break
    }
  }

  return mapped
}
