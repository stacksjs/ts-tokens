/**
 * Voting Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Voting mechanism types
 */
export type VotingMechanism
  = | 'token_weighted'
    | 'quadratic'
    | 'nft_based'
    | 'time_weighted'
    | 'conviction'

/**
 * Vote choice
 */
export type VoteChoice = 'for' | 'against' | 'abstain'

/**
 * Voting power calculation
 */
export interface VotingPower {
  own: bigint
  delegated: bigint
  total: bigint
  mechanism: VotingMechanism
}

/**
 * Vote record
 */
export interface VoteRecord {
  voter: PublicKey
  proposal: PublicKey
  choice: VoteChoice
  weight: bigint
  timestamp: number
  delegatedFrom?: PublicKey
}

/**
 * Voting config
 */
export interface VotingConfig {
  mechanism: VotingMechanism
  governanceToken?: PublicKey
  nftCollection?: PublicKey
  quorumPercentage: number
  approvalThreshold: number
  votingPeriod: number
  executionDelay: number
  allowEarlyExecution: boolean
  allowVoteChange: boolean
}

/**
 * Token-weighted config
 */
export interface TokenWeightedConfig {
  token: PublicKey
  snapshotAtProposalCreation: boolean
  preventDoubleVoting: boolean
}

/**
 * Quadratic voting config
 */
export interface QuadraticVotingConfig {
  token: PublicKey
  maxVotesPerVoter?: bigint
  costPerVote?: bigint
}

/**
 * NFT voting config
 */
export interface NFTVotingConfig {
  collection: PublicKey
  oneNftOneVote: boolean
  traitWeights?: Map<string, Map<string, number>>
}

/**
 * Time-weighted config
 */
export interface TimeWeightedConfig {
  token: PublicKey
  minHoldingPeriod: number
  maxMultiplier: number
  decayCurve: 'linear' | 'exponential'
}

/**
 * Conviction voting config
 */
export interface ConvictionVotingConfig {
  token: PublicKey
  halfLife: number
  maxConviction: number
}

/**
 * Vote breakdown
 */
export interface VoteBreakdown {
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  totalVotes: bigint
  quorumReached: boolean
  passingThreshold: boolean
  uniqueVoters: number
}

/**
 * Snapshot
 */
export interface VotingSnapshot {
  proposal: PublicKey
  slot: number
  timestamp: number
  totalSupply: bigint
  holders: Map<string, bigint>
}
