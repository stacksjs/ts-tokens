/**
 * Legacy Collection Discovery & Import
 *
 * Discover and import legacy NFT collections from on-chain data.
 */

import type { TokenConfig } from '../types'
import type {
  LegacyCollectionInfo,
  CollectionVersion,
  LegacyNFTItem,
  ImportResult,
} from '../types/legacy'
import { CollectionVersion as CV } from '../types/legacy'

/**
 * Import a collection by its mint address
 *
 * Fetches on-chain metadata, detects collection version, and returns collection info.
 */
export async function importCollection(
  collectionMint: string,
  config: TokenConfig
): Promise<ImportResult> {
  const { getNFTMetadata, fetchOffChainMetadata } = await import('../nft/metadata')
  const { getEditionInfo } = await import('../nft/editions')
  const { getNFTsByCollection } = await import('../nft/query')

  const metadata = await getNFTMetadata(collectionMint, config)
  if (!metadata) {
    throw new Error(`Collection not found: ${collectionMint}`)
  }

  // Detect version from on-chain data
  const version = await detectCollectionVersion(collectionMint, config)

  // Fetch off-chain metadata
  const offChainMetadata = await fetchOffChainMetadata(metadata.uri)

  // Fetch edition info
  const editionInfo = await getEditionInfo(collectionMint, config)

  const collection: LegacyCollectionInfo = {
    mint: collectionMint,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    version,
    updateAuthority: metadata.updateAuthority,
    sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
    isMutable: metadata.isMutable,
    size: editionInfo?.supply ?? undefined,
    creators: metadata.creators || [],
    offChainMetadata,
  }

  // Get sample NFTs
  const nfts = await getNFTsByCollection(collectionMint, config, 5)
  const sampleNFTs: LegacyNFTItem[] = nfts.map(nft => ({
    mint: nft.mint,
    name: nft.name,
    symbol: nft.symbol,
    uri: nft.uri,
  }))

  return {
    collection,
    nftCount: nfts.length,
    sampleNFTs,
  }
}

/**
 * Discover collections by a creator address using DAS API
 */
export async function discoverCollectionByCreator(
  creator: string,
  config: TokenConfig
): Promise<LegacyCollectionInfo[]> {
  const { createDASClient, getAssetCollection } = await import('../indexer/das')
  const rpcUrl = config.rpcUrl || 'https://api.mainnet-beta.solana.com'
  const client = createDASClient(rpcUrl)

  const result = await client.getAssetsByCreator(creator, {
    onlyVerified: true,
    limit: 1000,
  })

  // Group by collection
  const collectionMap = new Map<string, number>()
  for (const asset of result.items) {
    const col = getAssetCollection(asset)
    if (col) {
      collectionMap.set(col, (collectionMap.get(col) || 0) + 1)
    }
  }

  // Import each discovered collection
  const collections: LegacyCollectionInfo[] = []
  for (const [mint] of collectionMap) {
    try {
      const { getNFTMetadata } = await import('../nft/metadata')
      const metadata = await getNFTMetadata(mint, config)
      if (metadata) {
        const version = await detectCollectionVersion(mint, config)
        collections.push({
          mint,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          version,
          updateAuthority: metadata.updateAuthority,
          sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
          isMutable: metadata.isMutable,
          creators: metadata.creators || [],
        })
      }
    } catch {
      // Skip collections that can't be fetched
    }
  }

  return collections
}

/**
 * Discover collections by authority address using DAS API
 */
export async function discoverCollectionByAuthority(
  authority: string,
  config: TokenConfig
): Promise<LegacyCollectionInfo[]> {
  const { createDASClient, getAssetCollection } = await import('../indexer/das')
  const rpcUrl = config.rpcUrl || 'https://api.mainnet-beta.solana.com'
  const client = createDASClient(rpcUrl)

  const result = await client.getAssetsByAuthority(authority, { limit: 1000 })

  // Group by collection
  const collectionMap = new Map<string, number>()
  for (const asset of result.items) {
    const col = getAssetCollection(asset)
    if (col) {
      collectionMap.set(col, (collectionMap.get(col) || 0) + 1)
    }
  }

  const collections: LegacyCollectionInfo[] = []
  for (const [mint] of collectionMap) {
    try {
      const { getNFTMetadata } = await import('../nft/metadata')
      const metadata = await getNFTMetadata(mint, config)
      if (metadata) {
        const version = await detectCollectionVersion(mint, config)
        collections.push({
          mint,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          version,
          updateAuthority: metadata.updateAuthority,
          sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
          isMutable: metadata.isMutable,
          creators: metadata.creators || [],
        })
      }
    } catch {
      // Skip
    }
  }

  return collections
}

/**
 * Discover a collection by its Candy Machine address
 */
export async function discoverCollectionByCandyMachine(
  candyMachineAddress: string,
  config: TokenConfig
): Promise<LegacyCollectionInfo | null> {
  const { PublicKey } = await import('@solana/web3.js')
  const { createConnection } = await import('../drivers/solana/connection')
  const { deserializeCandyMachine } = await import('../programs/candy-machine/accounts')
  const { CANDY_MACHINE_PROGRAM_ID } = await import('../programs/candy-machine')

  const connection = createConnection(config)
  const cmPubkey = new PublicKey(candyMachineAddress)

  const accountInfo = await connection.getAccountInfo(cmPubkey)
  if (!accountInfo) {
    throw new Error(`Candy Machine not found: ${candyMachineAddress}`)
  }

  // Only v3 candy machines match this program ID
  if (accountInfo.owner.toBase58() === CANDY_MACHINE_PROGRAM_ID) {
    const cm = deserializeCandyMachine(accountInfo.data as Buffer)
    const collectionMint = cm.collectionMint.toBase58()

    const { getNFTMetadata } = await import('../nft/metadata')
    const metadata = await getNFTMetadata(collectionMint, config)
    if (!metadata) return null

    const version = await detectCollectionVersion(collectionMint, config)
    return {
      mint: collectionMint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      version,
      updateAuthority: metadata.updateAuthority,
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      isMutable: metadata.isMutable,
      creators: metadata.creators || [],
    }
  }

  return null
}

/**
 * Auto-detect collection version from on-chain data
 */
export async function detectCollectionVersion(
  collectionMint: string,
  config: TokenConfig
): Promise<CollectionVersion> {
  const { PublicKey } = await import('@solana/web3.js')
  const { createConnection } = await import('../drivers/solana/connection')
  const { findMetadataPda } = await import('../programs/token-metadata/pda')

  const connection = createConnection(config)
  const mintPubkey = new PublicKey(collectionMint)
  const [metadataAddress] = findMetadataPda(mintPubkey)

  const accountInfo = await connection.getAccountInfo(metadataAddress)
  if (!accountInfo) {
    return CV.Legacy
  }

  const data = accountInfo.data

  // Check for token standard field
  // After primary_sale_happened (1 byte) and is_mutable (1 byte) at variable offset,
  // there may be edition_nonce and token_standard fields
  // A simplified heuristic: if account data is large enough and has collection details, it's sized
  if (data.length > 400) {
    // Look for collectionDetails presence (non-zero at expected offset)
    // This is a heuristic - the exact offset depends on variable-length fields
    return CV.Sized
  }

  return CV.Legacy
}
