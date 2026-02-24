/**
 * NFT-Based Voting
 *
 * 1 NFT = 1 vote, or trait-weighted voting.
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type {
  VotingPower,
  NFTVotingConfig,
} from './types'

/**
 * Calculate NFT voting power
 */
export async function calculateNFTVotingPower(
  connection: Connection,
  voter: PublicKey,
  config: NFTVotingConfig
): Promise<VotingPower> {
  // Get NFTs owned by voter in collection
  const nfts = await getNFTsInCollection(connection, voter, config.collection)

  let totalPower = 0n

  if (config.oneNftOneVote) {
    // Simple: 1 NFT = 1 vote
    totalPower = BigInt(nfts.length)
  } else if (config.traitWeights) {
    // Trait-weighted: sum up trait values
    for (const nft of nfts) {
      totalPower += calculateTraitWeight(nft.traits, config.traitWeights)
    }
  }

  return {
    own: totalPower,
    delegated: 0n,
    total: totalPower,
    mechanism: 'nft_based',
  }
}

/**
 * Get NFTs in _collection owned by address
 */
async function getNFTsInCollection(
  _connection: Connection,
  _owner: PublicKey,
  _collection: PublicKey
): Promise<Array<{ mint: PublicKey; traits: Map<string, string> }>> {
  // In production, would use DAS API or on-chain data
  return []
}

/**
 * Calculate trait weight for an NFT
 */
function calculateTraitWeight(
  traits: Map<string, string>,
  weights: Map<string, Map<string, number>>
): bigint {
  let totalWeight = 1n // Base weight

  for (const [traitType, traitValue] of traits) {
    const traitWeights = weights.get(traitType)
    if (traitWeights) {
      const weight = traitWeights.get(traitValue)
      if (weight !== undefined) {
        totalWeight += BigInt(Math.floor(weight * 100)) // Scale to avoid decimals
      }
    }
  }

  return totalWeight
}

/**
 * Create trait weight configuration
 */
export function createTraitWeights(
  config: Array<{
    traitType: string
    values: Array<{ value: string; weight: number }>
  }>
): Map<string, Map<string, number>> {
  const weights = new Map<string, Map<string, number>>()

  for (const trait of config) {
    const valueWeights = new Map<string, number>()
    for (const v of trait.values) {
      valueWeights.set(v.value, v.weight)
    }
    weights.set(trait.traitType, valueWeights)
  }

  return weights
}

/**
 * Example trait weights for rarity-based voting
 */
export function createRarityWeights(): Map<string, Map<string, number>> {
  return createTraitWeights([
    {
      traitType: 'Rarity',
      values: [
        { value: 'Common', weight: 1 },
        { value: 'Uncommon', weight: 2 },
        { value: 'Rare', weight: 5 },
        { value: 'Epic', weight: 10 },
        { value: 'Legendary', weight: 25 },
      ],
    },
  ])
}

/**
 * Check if voter is eligible (owns at least 1 NFT)
 */
export async function isEligibleVoter(
  connection: Connection,
  voter: PublicKey,
  collection: PublicKey
): Promise<boolean> {
  const nfts = await getNFTsInCollection(connection, voter, collection)
  return nfts.length > 0
}

/**
 * Get _collection voting stats
 */
export async function getCollectionVotingStats(
  _connection: Connection,
  _collection: PublicKey
): Promise<{
  totalNFTs: number
  totalVotingPower: bigint
  uniqueHolders: number
}> {
  // In production, would query collection data
  return {
    totalNFTs: 0,
    totalVotingPower: 0n,
    uniqueHolders: 0,
  }
}

/**
 * Validate NFT vote
 */
export async function validateNFTVote(
  connection: Connection,
  voter: PublicKey,
  config: NFTVotingConfig
): Promise<{ valid: boolean; reason?: string; nftCount: number }> {
  const nfts = await getNFTsInCollection(connection, voter, config.collection)

  if (nfts.length === 0) {
    return {
      valid: false,
      reason: 'No NFTs from this collection',
      nftCount: 0,
    }
  }

  return {
    valid: true,
    nftCount: nfts.length,
  }
}

/**
 * Format NFT voting power
 */
export function formatNFTVotingPower(
  nftCount: number,
  votingPower: bigint,
  isTraitWeighted: boolean
): string {
  const lines = [
    `NFTs Owned: ${nftCount}`,
    `Voting Power: ${votingPower.toString()}`,
  ]

  if (isTraitWeighted) {
    const avgPower = nftCount > 0 ? Number(votingPower) / nftCount : 0
    lines.push(`Avg Power per NFT: ${avgPower.toFixed(2)}`)
  }

  return lines.join('\n')
}

/**
 * Simulate trait-weighted distribution
 */
export function simulateTraitWeightedVoting(
  nfts: Array<{ traits: Map<string, string> }>,
  weights: Map<string, Map<string, number>>
): Array<{ nftIndex: number; weight: bigint }> {
  return nfts.map((nft, i) => ({
    nftIndex: i,
    weight: calculateTraitWeight(nft.traits, weights),
  }))
}
