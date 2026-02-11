/**
 * Simple NFT Creation
 *
 * Simplified NFT creation that delegates to existing nft/ and programs/token-metadata/ modules.
 * Provides a cleaner API with sensible defaults (royalty as %, isMutable defaults to false).
 */

import { PublicKey } from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import type {
  SimpleNFT,
  SimpleCreator,
  CreateSimpleNFTOptions,
  SimpleNFTResult,
  UpdateSimpleNFTOptions,
} from './types'
import type { TokenConfig } from '../types'

/**
 * Create a simple NFT
 *
 * Handles image upload (if Buffer), metadata generation, upload, and NFT creation
 * in a single call. Delegates to `createNFT()` from `nft/create.ts`.
 *
 * @param connection - Solana connection
 * @param payer - Payer public key
 * @param options - NFT creation options (royalty as %, not basis points)
 * @param config - ts-tokens configuration
 * @returns SimpleNFTResult with mint, metadata, masterEdition, signature, uri
 *
 * @example
 * ```ts
 * const nft = await createSimpleNFT(connection, payer, {
 *   name: 'My NFT',
 *   image: 'https://example.com/image.png',
 *   royalty: 5, // 5% (not basis points)
 * }, config)
 * ```
 */
export async function createSimpleNFT(
  connection: Connection,
  payer: PublicKey,
  options: CreateSimpleNFTOptions,
  config: TokenConfig
): Promise<SimpleNFTResult> {
  const {
    name,
    symbol = '',
    description,
    image,
    attributes,
    royalty = 0,
    creators,
    collection,
    isMutable = false,
    maxEditions,
  } = options

  // Convert royalty percentage to basis points (5% -> 500)
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
    attributes,
  })
  const metadataJson = generateMetadataJSON(metadataObj)

  const { getStorageAdapter } = await import('../storage')
  const storage = getStorageAdapter(config.storageProvider || 'arweave', config)
  const metadataUpload = await storage.upload(metadataJson, { contentType: 'application/json' })
  const metadataUri = metadataUpload.url

  // Convert creators to the format expected by createNFT
  const nftCreators = creators?.map(c => ({
    address: c.address.toBase58(),
    verified: false,
    share: c.share,
  }))

  // Delegate to existing createNFT
  const { createNFT } = await import('../nft/create')
  const result = await createNFT(
    {
      name,
      symbol,
      uri: metadataUri,
      sellerFeeBasisPoints,
      creators: nftCreators,
      collection: collection?.toBase58(),
      isMutable,
      maxSupply: maxEditions ?? 0,
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
 * Get simple NFT data
 *
 * Fetches on-chain metadata and transforms it to the SimpleNFT format.
 * Converts basis points back to percentage, string addresses to PublicKey.
 */
export async function getSimpleNFT(
  connection: Connection,
  mint: PublicKey,
  config: TokenConfig
): Promise<SimpleNFT | null> {
  const { getNFTMetadata } = await import('../nft/metadata')

  const metadata = await getNFTMetadata(mint.toBase58(), config)
  if (!metadata) {
    return null
  }

  // Transform NFTMetadata -> SimpleNFT
  const creators: SimpleCreator[] = (metadata.creators || []).map(c => ({
    address: new PublicKey(c.address),
    share: c.share,
    verified: c.verified,
  }))

  // Try to get current owner via token largest accounts
  let owner = mint // fallback
  try {
    const largestAccounts = await connection.getTokenLargestAccounts(mint)
    for (const account of largestAccounts.value) {
      if (account.uiAmount === 1) {
        const accountInfo = await connection.getParsedAccountInfo(account.address)
        if (accountInfo.value) {
          const parsed = (accountInfo.value.data as any).parsed
          owner = new PublicKey(parsed.info.owner)
          break
        }
      }
    }
  } catch {
    // Fall back to mint as placeholder
  }

  return {
    mint,
    owner,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    royalty: metadata.sellerFeeBasisPoints / 100, // bps -> percentage
    creators,
    collection: undefined, // Would require additional on-chain parsing
    collectionVerified: false,
    isMutable: metadata.isMutable,
    primarySaleHappened: metadata.primarySaleHappened,
  }
}

/**
 * Update simple NFT metadata
 *
 * Converts royalty percentage to basis points and delegates to updateNFTMetadata.
 */
export async function updateSimpleNFT(
  connection: Connection,
  mint: PublicKey,
  authority: PublicKey,
  updates: UpdateSimpleNFTOptions,
  config: TokenConfig
): Promise<string> {
  const { updateNFTMetadata } = await import('../nft/metadata')

  const result = await updateNFTMetadata(
    mint.toBase58(),
    {
      name: updates.name,
      symbol: updates.symbol,
      uri: updates.uri,
      sellerFeeBasisPoints: updates.royalty !== undefined
        ? Math.round(updates.royalty * 100)
        : undefined,
      isMutable: updates.isMutable,
    },
    config
  )

  return result.signature
}

/**
 * Freeze simple NFT (make immutable)
 *
 * Sets isMutable to false via updateNFTMetadata. This is irreversible.
 */
export async function freezeSimpleNFT(
  connection: Connection,
  mint: PublicKey,
  authority: PublicKey,
  config: TokenConfig
): Promise<string> {
  const { updateNFTMetadata } = await import('../nft/metadata')

  const result = await updateNFTMetadata(
    mint.toBase58(),
    { isMutable: false },
    config
  )

  return result.signature
}

/**
 * Verify NFT authenticity (pure validation, no network calls)
 */
export function verifySimpleNFT(nft: SimpleNFT): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  if (!nft.name) issues.push('Missing name')
  if (!nft.uri) issues.push('Missing URI')
  if (nft.royalty < 0 || nft.royalty > 100) issues.push('Invalid royalty')

  const totalShares = nft.creators.reduce((sum, c) => sum + c.share, 0)
  if (nft.creators.length > 0 && totalShares !== 100) issues.push('Creator shares must sum to 100')

  return {
    valid: issues.length === 0,
    issues,
  }
}
