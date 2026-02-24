/**
 * NFT Queries
 *
 * Query NFTs by owner, collection, creator, etc.
 */

import { Connection, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import type { TokenConfig, NFTMetadata } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { getNFTMetadata } from './metadata'

/**
 * Token Metadata Program ID
 */
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Get all NFTs owned by an address
 */
export async function getNFTsByOwner(
  owner: string,
  config: TokenConfig
): Promise<NFTMetadata[]> {
  const connection = createConnection(config)
  const ownerPubkey = new PublicKey(owner)

  // Get all token accounts for owner
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    ownerPubkey,
    { programId: TOKEN_PROGRAM_ID }
  )

  const nfts: NFTMetadata[] = []

  for (const { account } of tokenAccounts.value) {
    const parsed = account.data.parsed
    const info = parsed.info

    // NFTs have 0 decimals and amount of 1
    if (
      info.tokenAmount.decimals === 0 &&
      info.tokenAmount.uiAmount === 1
    ) {
      try {
        const metadata = await getNFTMetadata(info.mint, config)
        if (metadata) {
          nfts.push(metadata)
        }
      } catch {
        // Skip if metadata fetch fails
      }
    }
  }

  return nfts
}

/**
 * Get all NFTs in a collection
 */
export async function getNFTsByCollection(
  collection: string,
  config: TokenConfig,
  limit: number = 100
): Promise<NFTMetadata[]> {
  const connection = createConnection(config)
  const collectionPubkey = new PublicKey(collection)

  // Get metadata accounts that reference this collection
  // This requires searching through metadata accounts
  const accounts = await connection.getProgramAccounts(
    TOKEN_METADATA_PROGRAM_ID,
    {
      filters: [
        { dataSize: 679 }, // Metadata account size
        {
          memcmp: {
            offset: 326, // Collection key offset in metadata
            bytes: collectionPubkey.toBase58(),
          },
        },
      ],
    }
  )

  const nfts: NFTMetadata[] = []

  for (const { pubkey, account } of accounts.slice(0, limit)) {
    try {
      // Extract mint from metadata account
      const mintBytes = account.data.slice(33, 65)
      const mint = new PublicKey(mintBytes).toBase58()

      const metadata = await getNFTMetadata(mint, config)
      if (metadata) {
        nfts.push(metadata)
      }
    } catch {
      // Skip if parsing fails
    }
  }

  return nfts
}

/**
 * Get all NFTs by a creator
 */
export async function getNFTsByCreator(
  creator: string,
  config: TokenConfig,
  limit: number = 100
): Promise<NFTMetadata[]> {
  const connection = createConnection(config)
  const creatorPubkey = new PublicKey(creator)

  // Search for metadata accounts with this creator
  // First creator is at offset 326 + 1 (after collection option)
  const accounts = await connection.getProgramAccounts(
    TOKEN_METADATA_PROGRAM_ID,
    {
      filters: [
        { dataSize: 679 },
        {
          memcmp: {
            offset: 326 + 1 + 4, // After collection option + creators vec length
            bytes: creatorPubkey.toBase58(),
          },
        },
      ],
    }
  )

  const nfts: NFTMetadata[] = []

  for (const { pubkey, account } of accounts.slice(0, limit)) {
    try {
      const mintBytes = account.data.slice(33, 65)
      const mint = new PublicKey(mintBytes).toBase58()

      const metadata = await getNFTMetadata(mint, config)
      if (metadata) {
        nfts.push(metadata)
      }
    } catch {
      // Skip if parsing fails
    }
  }

  return nfts
}

/**
 * Get collection info
 */
export async function getCollectionInfo(
  _collection: string,
  _config: TokenConfig
): Promise<{
  metadata: NFTMetadata | null
  size: number
}> {
  const metadata = await getNFTMetadata(collection, config)

  // Count NFTs in collection
  const connection = createConnection(config)
  const collectionPubkey = new PublicKey(collection)

  const accounts = await connection.getProgramAccounts(
    TOKEN_METADATA_PROGRAM_ID,
    {
      filters: [
        { dataSize: 679 },
        {
          memcmp: {
            offset: 326,
            bytes: collectionPubkey.toBase58(),
          },
        },
      ],
      dataSlice: { offset: 0, length: 0 }, // Don't fetch data, just count
    }
  )

  return {
    metadata,
    size: accounts.length,
  }
}

/**
 * Check if an NFT belongs to a collection
 */
export async function isInCollection(
  mint: string,
  collection: string,
  config: TokenConfig
): Promise<boolean> {
  const metadata = await getNFTMetadata(mint, config)
  if (!metadata) {
    return false
  }

  // Check if metadata has collection field matching
  // This would require parsing the collection field from on-chain data
  // For now, we'll do a simple check via the metadata
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)

  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintPubkey.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )

  const accountInfo = await connection.getAccountInfo(metadataAddress)
  if (!accountInfo) {
    return false
  }

  // Check collection field at offset 326
  const hasCollection = accountInfo.data[326] === 1
  if (!hasCollection) {
    return false
  }

  const collectionKey = new PublicKey(accountInfo.data.slice(327, 359))
  return collectionKey.toBase58() === collection
}

/**
 * Get NFT holder
 */
export async function getNFTHolder(
  mint: string,
  config: TokenConfig
): Promise<string | null> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)

  const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey)

  for (const account of largestAccounts.value) {
    if (account.uiAmount === 1) {
      const accountInfo = await connection.getParsedAccountInfo(account.address)
      if (accountInfo.value) {
        const parsed = (accountInfo.value.data as any).parsed
        return parsed.info.owner
      }
    }
  }

  return null
}

/**
 * Get NFT transaction history
 */
export async function getNFTHistory(
  _mint: string,
  _config: TokenConfig,
  _limit: number = 20
): Promise<Array<{
  signature: string
  slot: number
  blockTime: number | null
  type: string
}>> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)

  const signatures = await connection.getSignaturesForAddress(
    mintPubkey,
    { limit }
  )

  return signatures.map(sig => ({
    signature: sig.signature,
    slot: sig.slot,
    blockTime: sig.blockTime ?? null,
    type: sig.memo || 'unknown',
  }))
}
