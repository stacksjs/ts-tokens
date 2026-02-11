/**
 * Simple NFT Collections
 *
 * Simplified collection management that delegates to existing nft/ modules.
 * Provides cleaner APIs with royalty as %, sensible defaults, fewer params.
 */

import { PublicKey } from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import type {
  SimpleCollection,
  SimpleNFT,
  CreateSimpleCollectionOptions,
  SimpleCollectionResult,
} from './types'
import type { TokenConfig } from '../types'

/**
 * Create a simple collection
 *
 * Handles image upload, metadata generation, and collection NFT creation.
 * Delegates to `createCollection()` from `nft/create.ts`.
 */
export async function createSimpleCollection(
  connection: Connection,
  payer: PublicKey,
  options: CreateSimpleCollectionOptions,
  config: TokenConfig
): Promise<SimpleCollectionResult> {
  const {
    name,
    symbol = '',
    description,
    image,
    royalty = 0,
  } = options

  const sellerFeeBasisPoints = Math.round(royalty * 100)

  // Handle image upload if Buffer
  let imageUri: string
  if (Buffer.isBuffer(image)) {
    const { getStorageAdapter } = await import('../storage')
    const storage = getStorageAdapter(config.storageProvider || 'arweave', config)
    const uploadResult = await storage.upload(image, { contentType: 'image/png' })
    imageUri = uploadResult.url
  } else {
    imageUri = image
  }

  // Generate and upload metadata JSON
  const { createMetadata, generateMetadataJSON } = await import('./metadata')
  const metadataObj = createMetadata({
    name,
    description,
    image: imageUri,
  })
  const metadataJson = generateMetadataJSON(metadataObj)

  const { getStorageAdapter } = await import('../storage')
  const storage = getStorageAdapter(config.storageProvider || 'arweave', config)
  const metadataUpload = await storage.upload(metadataJson, { contentType: 'application/json' })
  const metadataUri = metadataUpload.url

  // Delegate to existing createCollection
  const { createCollection: createCol } = await import('../nft/create')
  const result = await createCol(
    {
      name,
      symbol,
      uri: metadataUri,
      sellerFeeBasisPoints,
      isMutable: true,
    },
    config
  )

  return {
    mint: result.mint,
    metadata: result.metadata,
    masterEdition: result.masterEdition || '',
    signature: result.signature,
    uri: result.uri,
  }
}

/**
 * Get collection info
 *
 * Reads collection NFT metadata and transforms to SimpleCollection.
 */
export async function getSimpleCollection(
  connection: Connection,
  mint: PublicKey,
  config: TokenConfig
): Promise<SimpleCollection | null> {
  const { getNFTMetadata } = await import('../nft/metadata')
  const { getCollectionInfo } = await import('../nft/query')

  const metadata = await getNFTMetadata(mint.toBase58(), config)
  if (!metadata) {
    return null
  }

  // Get collection size
  const collectionInfo = await getCollectionInfo(mint.toBase58(), config)

  return {
    mint,
    authority: new PublicKey(metadata.updateAuthority),
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    royalty: metadata.sellerFeeBasisPoints / 100,
    size: collectionInfo.size,
    verified: true,
  }
}

/**
 * Add NFT to collection
 *
 * Verifies an NFT as part of a collection. Delegates to `verifyCollectionItem()`.
 */
export async function addToCollection(
  connection: Connection,
  nftMint: PublicKey,
  collectionMint: PublicKey,
  collectionAuthority: PublicKey,
  config: TokenConfig
): Promise<string> {
  const { verifyCollectionItem } = await import('../nft/collection')

  const result = await verifyCollectionItem(
    nftMint.toBase58(),
    collectionMint.toBase58(),
    config
  )

  return result.signature
}

/**
 * Remove NFT from collection
 *
 * Unverifies an NFT from a collection. Delegates to `unverifyCollectionItem()`.
 */
export async function removeFromCollection(
  connection: Connection,
  nftMint: PublicKey,
  collectionMint: PublicKey,
  collectionAuthority: PublicKey,
  config: TokenConfig
): Promise<string> {
  const { unverifyCollectionItem } = await import('../nft/collection')

  const result = await unverifyCollectionItem(
    nftMint.toBase58(),
    collectionMint.toBase58(),
    config
  )

  return result.signature
}

/**
 * Get all NFTs in collection
 *
 * Delegates to getNFTsByCollection and transforms results to SimpleNFT[].
 */
export async function getCollectionNFTs(
  connection: Connection,
  collectionMint: PublicKey,
  config: TokenConfig,
  options: { limit?: number; offset?: number } = {}
): Promise<SimpleNFT[]> {
  const { getNFTsByCollection } = await import('../nft/query')

  const limit = options.limit ?? 50
  const nfts = await getNFTsByCollection(collectionMint.toBase58(), config, limit)

  return nfts.map(metadata => ({
    mint: new PublicKey(metadata.mint),
    owner: new PublicKey(metadata.updateAuthority),
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    royalty: metadata.sellerFeeBasisPoints / 100,
    creators: (metadata.creators || []).map(c => ({
      address: new PublicKey(c.address),
      share: c.share,
      verified: c.verified,
    })),
    collection: collectionMint,
    collectionVerified: true,
    isMutable: metadata.isMutable,
    primarySaleHappened: metadata.primarySaleHappened,
  }))
}

/**
 * Get collection size
 *
 * Returns the number of verified NFTs in a collection.
 */
export async function getCollectionSize(
  connection: Connection,
  collectionMint: PublicKey,
  config: TokenConfig
): Promise<number> {
  const { getCollectionInfo } = await import('../nft/query')
  const info = await getCollectionInfo(collectionMint.toBase58(), config)
  return info.size
}

/**
 * Update collection metadata
 *
 * Delegates to updateCollection() from nft/collection.ts.
 */
export async function updateCollection(
  connection: Connection,
  collectionMint: PublicKey,
  authority: PublicKey,
  updates: {
    name?: string
    symbol?: string
    uri?: string
  },
  config: TokenConfig
): Promise<string> {
  const { updateCollection: updateCol } = await import('../nft/collection')

  const result = await updateCol(
    {
      collectionMint: collectionMint.toBase58(),
      name: updates.name,
      symbol: updates.symbol,
      uri: updates.uri,
    },
    config
  )

  return result.signature
}

/**
 * Set collection size (for sized collections)
 *
 * Uses setCollectionSize instruction from programs/token-metadata.
 */
export async function setCollectionSize(
  connection: Connection,
  collectionMint: PublicKey,
  authority: PublicKey,
  size: number,
  config: TokenConfig
): Promise<string> {
  const { setCollectionSize: setSize } = await import('../programs/token-metadata/instructions')
  const { findMetadataPda } = await import('../programs/token-metadata/pda')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { loadWallet } = await import('../drivers/solana/wallet')

  const [collectionMetadata] = findMetadataPda(collectionMint)
  const payer = loadWallet(config)

  const instruction = setSize({
    collectionMetadata,
    collectionAuthority: payer.publicKey,
    collectionMint,
    size: BigInt(size),
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)
  return result.signature
}

/**
 * Transfer collection authority
 *
 * Updates the update authority on the collection metadata account.
 */
export async function transferCollectionAuthority(
  connection: Connection,
  collectionMint: PublicKey,
  currentAuthority: PublicKey,
  newAuthority: PublicKey,
  config: TokenConfig
): Promise<string> {
  const { updateCollection: updateCol } = await import('../nft/collection')

  const result = await updateCol(
    {
      collectionMint: collectionMint.toBase58(),
      newUpdateAuthority: newAuthority.toBase58(),
    },
    config
  )

  return result.signature
}

/**
 * Verify collection authenticity (pure validation, no network calls)
 */
export function verifyCollection(collection: SimpleCollection): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  if (!collection.name) issues.push('Missing name')
  if (!collection.uri) issues.push('Missing URI')
  if (collection.royalty < 0 || collection.royalty > 100) {
    issues.push('Invalid royalty')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Get collection stats
 *
 * Returns size, verified count, and unique owner count.
 */
export async function getCollectionStats(
  connection: Connection,
  collectionMint: PublicKey,
  config: TokenConfig
): Promise<{
  size: number
  verified: number
  owners: number
}> {
  const { getCollectionInfo } = await import('../nft/query')
  const { getNFTsByCollection } = await import('../nft/query')

  const info = await getCollectionInfo(collectionMint.toBase58(), config)
  const nfts = await getNFTsByCollection(collectionMint.toBase58(), config, 1000)

  // Count unique update authorities as a proxy for owners
  const uniqueAuthorities = new Set(nfts.map(n => n.updateAuthority))

  return {
    size: info.size,
    verified: info.size,
    owners: uniqueAuthorities.size,
  }
}
