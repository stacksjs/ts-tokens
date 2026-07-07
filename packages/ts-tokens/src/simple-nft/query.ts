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
 *
 * `owner` must be the real token holder. It is intentionally required: the
 * metadata update authority is NOT the owner, so there is no safe fallback.
 */
function toSimpleNFT(metadata: NFTMetadata, owner: PublicKey, collection?: PublicKey): SimpleNFT {
  return {
    mint: new PublicKey(metadata.mint),
    owner,
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

  const { getNFTHolder } = await import('../nft/query')

  const nfts = await getNFTsByCollection(collectionMint.toBase58(), config, limit)

  // Resolve the real holder for each NFT. The metadata update authority is not
  // the owner, so we look up the largest token account holder per mint.
  const result: SimpleNFT[] = []
  for (const m of nfts) {
    const holder = await getNFTHolder(m.mint, config)
    if (!holder) {
      // Skip NFTs whose holder cannot be resolved rather than fabricating one.
      continue
    }
    result.push(toSimpleNFT(m, new PublicKey(holder), collectionMint))
  }
  return result
}
