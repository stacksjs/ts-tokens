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
  // Validate configuration BEFORE touching the network: oneNftOneVote false
  // without traitWeights is a configuration error with no possible weighting.
  if (!config.oneNftOneVote && !config.traitWeights) {
    throw new Error(
      'NFT voting config requires traitWeights when oneNftOneVote is false'
    )
  }

  // Get NFTs owned by voter in collection
  const nfts = await getNFTsInCollection(connection, voter, config.collection)

  let totalPower = 0n

  if (config.oneNftOneVote) {
    // Simple: 1 NFT = 1 vote
    totalPower = BigInt(nfts.length)
  } else if (config.traitWeights) {
    // Trait-weighted: sum up trait values. calculateTraitWeight returns weights
    // scaled by TRAIT_WEIGHT_SCALE (to preserve fractional weights as integers),
    // so divide back out to land on a "Common NFT ≈ 1 vote" scale.
    let scaledPower = 0n
    for (const nft of nfts) {
      scaledPower += calculateTraitWeight(nft.traits, config.traitWeights)
    }
    totalPower = scaledPower / TRAIT_WEIGHT_SCALE
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
  // Enumerating a voter's NFTs with their traits requires either the DAS
  // (Digital Asset Standard) API on a DAS-enabled RPC, or an on-chain index
  // of collection members. Neither is configured here. Returning [] would
  // silently give every voter zero power — throw instead of fabricating a
  // disenfranchisement.
  throw new Error(
    'NFT membership lookup is not implemented: enumerating NFTs (with traits) ' +
    'owned by a wallet in a collection requires the DAS API or on-chain indexing, ' +
    'neither of which is configured.'
  )
}

/**
 * Fixed-point scale for trait weights. Weights are multiplied by this factor so
 * fractional weights (e.g. 1.5x) survive as integers; callers divide the summed
 * result back out by the same factor.
 */
const TRAIT_WEIGHT_SCALE = 100n

/**
 * Calculate trait weight for an NFT, scaled by TRAIT_WEIGHT_SCALE.
 *
 * The base weight is one full "vote" (TRAIT_WEIGHT_SCALE), and each matching
 * trait adds its own scaled weight. Divide the result by TRAIT_WEIGHT_SCALE to
 * get whole-vote power, so an NFT with no extra trait weights ≈ 1 vote.
 */
function calculateTraitWeight(
  traits: Map<string, string>,
  weights: Map<string, Map<string, number>>
): bigint {
  let totalWeight = TRAIT_WEIGHT_SCALE // Base weight of 1 vote, scaled.

  for (const [traitType, traitValue] of traits) {
    const traitWeights = weights.get(traitType)
    if (traitWeights) {
      const weight = traitWeights.get(traitValue)
      if (weight !== undefined) {
        totalWeight += BigInt(Math.floor(weight * Number(TRAIT_WEIGHT_SCALE)))
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
  // Total supply and holder distribution of a collection require the DAS API
  // or on-chain indexing; neither is configured. Returning zeros would
  // silently fabricate an empty collection — throw instead.
  throw new Error(
    'getCollectionVotingStats is not implemented: collection supply and holder ' +
    'counts require the DAS API or on-chain indexing, neither of which is configured.'
  )
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
    // Divide out the fixed-point scale so weights are whole-vote units.
    weight: calculateTraitWeight(nft.traits, weights) / TRAIT_WEIGHT_SCALE,
  }))
}
