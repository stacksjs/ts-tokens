/**
 * NFT Membership Integration
 *
 * Use NFT collection ownership for DAO membership and voting power.
 */

import type { Connection, PublicKey } from '@solana/web3.js'

/**
 * Get NFT _collection membership (count of NFTs held from a _collection)
 */
export async function getNFTCollectionMembership(
  _connection: Connection,
  _voter: PublicKey,
  _collection: PublicKey
): Promise<{ isMember: boolean; nftCount: number }> {
  // In production, would query NFT accounts from ts-tokens/nft
  return { isMember: false, nftCount: 0 }
}

/**
 * Check if an address holds at least one NFT from a collection
 */
export async function isCollectionMember(
  connection: Connection,
  voter: PublicKey,
  collection: PublicKey
): Promise<boolean> {
  const { isMember } = await getNFTCollectionMembership(connection, voter, collection)
  return isMember
}

/**
 * Get NFT-based voting power for a voter from a specific collection.
 * Returns 1 vote per NFT held.
 */
export async function getNFTVotingPower(
  connection: Connection,
  voter: PublicKey,
  collection: PublicKey
): Promise<bigint> {
  const { nftCount } = await getNFTCollectionMembership(connection, voter, collection)
  return BigInt(nftCount)
}
