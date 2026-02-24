/**
 * Simple NFT Query
 *
 * Query NFTs by owner or collection. Wraps nft/query.ts and transforms
 * results to SimpleNFT format.
 */

import { PublicKey } from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import type { SimpleNFT } from './types'
import type { TokenConfig, NFTMetadata } from '../types'

/**
 * Transform NFTMetadata to SimpleNFT
 */
function toSimpleNFT(metadata: NFTMetadata, owner?: PublicKey, collection?: PublicKey): SimpleNFT {
  return {
    mint: new PublicKey(metadata.mint),
    owner: owner ?? new PublicKey(metadata.updateAuthority),
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    royalty: metadata.sellerFeeBasisPoints / 100,
    creators: (metadata.creators || []).map(c => ({
      address: new PublicKey(c.address),
      share: c.share,
      verified: c.verified,
    })),
    collection,
    collectionVerified: !!collection,
    isMutable: metadata.isMutable,
    primarySaleHappened: metadata.primarySaleHappened,
  }
}

/**
 * Get NFTs owned by an address
 *
 * Delegates to getNFTsByOwner from nft/query.ts and transforms results.
 *
 * @param connection - Solana connection
 * @param owner - Owner wallet address
 * @param config - ts-tokens configuration
 * @returns Array of SimpleNFT objects
 */
export async function getSimpleNFTsByOwner(
  _connection: Connection,
  owner: PublicKey,
  config: TokenConfig
): Promise<SimpleNFT[]> {
  const { getNFTsByOwner } = await import('../nft/query')

  const nfts = await getNFTsByOwner(owner.toBase58(), config)
  return nfts.map(m => toSimpleNFT(m, owner))
}

/**
 * Get NFTs in a collection
 *
 * Delegates to getNFTsByCollection from nft/query.ts and transforms results.
 *
 * @param connection - Solana connection
 * @param collectionMint - Collection mint address
 * @param config - ts-tokens configuration
 * @param limit - Maximum number of NFTs to return
 * @returns Array of SimpleNFT objects
 */
export async function getSimpleNFTsByCollection(
  _connection: Connection,
  collectionMint: PublicKey,
  config: TokenConfig,
  limit: number = 100
): Promise<SimpleNFT[]> {
  const { getNFTsByCollection } = await import('../nft/query')

  const nfts = await getNFTsByCollection(collectionMint.toBase58(), config, limit)
  return nfts.map(m => toSimpleNFT(m, undefined, collectionMint))
}
