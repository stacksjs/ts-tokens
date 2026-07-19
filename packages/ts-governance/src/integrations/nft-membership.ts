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
  // Counting a wallet's NFTs in a collection requires the DAS (Digital Asset
  // Standard) API or an on-chain collection index; neither is configured.
  // Returning { isMember: false, nftCount: 0 } would silently strip every
  // holder's membership/voting power — throw instead.
  throw new Error(
    'getNFTCollectionMembership is not implemented: enumerating NFTs owned by ' +
    'a wallet in a collection requires the DAS API or on-chain indexing, neither ' +
    'of which is configured.'
  )
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
