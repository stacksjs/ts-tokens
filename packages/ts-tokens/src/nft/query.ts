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
import { deserializeMetadata } from '../programs/token-metadata/accounts'

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
  _collection: string,
  _config: TokenConfig,
  _limit: number = 100
): Promise<NFTMetadata[]> {
  // The collection field lives AFTER the variable-length creators array in the
  // metadata account, so it has no fixed offset and cannot be located with a
  // getProgramAccounts memcmp (the old offset 326 actually matched the first
  // creator's pubkey, returning wrong/empty results). Enumerating a collection's
  // members requires the DAS API (getAssetsByGroup with groupKey 'collection').
  throw new Error(
    'getNFTsByCollection is not implemented via RPC: the metadata collection ' +
    'field is at a variable offset and cannot be memcmp-filtered. Use the DAS API ' +
    '(getAssetsByGroup groupKey=collection) — see src/nft/compressed/query.ts.'
  )
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

  // The first creator's pubkey is at offset 326: key(1)+updateAuth(32)+mint(32)
  // +name(4+32)+symbol(4+10)+uri(4+200)+sellerFee(2)+creatorsOption(1)+vecLen(4)
  // = 326. This matches NFTs whose FIRST creator is the given address.
  const accounts = await connection.getProgramAccounts(
    TOKEN_METADATA_PROGRAM_ID,
    {
      filters: [
        { dataSize: 679 },
        {
          memcmp: {
            offset: 326,
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

/** Result of {@link getCollectionInfo}. */
export interface CollectionInfoResult {
  metadata: NFTMetadata | null
  size: number | null
}

/**
 * Get collection info.
 *
 * Returns the collection NFT's own metadata. The member `size` cannot be counted
 * via RPC (the collection field is at a variable offset — see
 * getNFTsByCollection), so it is reported as `null` rather than a wrong number;
 * use the DAS API to count collection members.
 */
export async function getCollectionInfo(
  collection: string,
  config: TokenConfig
): Promise<CollectionInfoResult> {
  const metadata = await getNFTMetadata(collection, config)
  return {
    metadata,
    size: null,
  }
}

/**
 * Check if an NFT belongs to a collection.
 *
 * Fully deserializes the NFT's metadata account and compares the verified
 * collection key — the old code read a fixed byte offset (326) that actually
 * points into the creators array, not the collection field.
 */
export async function isInCollection(
  mint: string,
  collection: string,
  config: TokenConfig
): Promise<boolean> {
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

  const parsed = deserializeMetadata(accountInfo.data)
  return parsed.collection?.key.toBase58() === collection
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
// eslint-disable-next-line no-unused-vars
export async function getNFTHistory(
  mint: string,
  config: TokenConfig,
  limit: number = 20
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
