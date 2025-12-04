/**
 * Staking Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Staking pool configuration
 */
export interface StakingPool {
  address: PublicKey
  authority: PublicKey
  stakeMint: PublicKey
  rewardMint: PublicKey
  totalStaked: bigint
  rewardRate: bigint
  rewardDuration: bigint
  lastUpdateTime: bigint
  rewardPerTokenStored: bigint
  minStakeDuration: bigint
  earlyUnstakePenalty: number // basis points
  paused: boolean
}

/**
 * User stake info
 */
export interface StakeInfo {
  owner: PublicKey
  pool: PublicKey
  amount: bigint
  rewardDebt: bigint
  stakedAt: bigint
  lastClaimTime: bigint
  lockEndTime: bigint
}

/**
 * NFT stake info
 */
export interface NFTStakeInfo {
  owner: PublicKey
  pool: PublicKey
  mint: PublicKey
  stakedAt: bigint
  lastClaimTime: bigint
  lockEndTime: bigint
  pointsEarned: bigint
}

/**
 * Create staking pool options
 */
export interface CreatePoolOptions {
  stakeMint: PublicKey
  rewardMint: PublicKey
  rewardRate: bigint
  rewardDuration: bigint
  minStakeDuration?: bigint
  earlyUnstakePenalty?: number
}

/**
 * Stake options
 */
export interface StakeOptions {
  pool: PublicKey
  amount: bigint
  lockDuration?: bigint
}

/**
 * Unstake options
 */
export interface UnstakeOptions {
  pool: PublicKey
  amount: bigint
  forceEarly?: boolean
}

/**
 * Claim rewards options
 */
export interface ClaimOptions {
  pool: PublicKey
}

/**
 * NFT staking pool
 */
export interface NFTStakingPool {
  address: PublicKey
  authority: PublicKey
  collection: PublicKey
  rewardMint: PublicKey
  pointsPerDay: bigint
  totalStaked: bigint
  paused: boolean
}

/**
 * Create NFT staking pool options
 */
export interface CreateNFTPoolOptions {
  collection: PublicKey
  rewardMint: PublicKey
  pointsPerDay: bigint
}

/**
 * Stake NFT options
 */
export interface StakeNFTOptions {
  pool: PublicKey
  mint: PublicKey
}

/**
 * Unstake NFT options
 */
export interface UnstakeNFTOptions {
  pool: PublicKey
  mint: PublicKey
}

/**
 * Staking rewards calculation
 */
export interface RewardsCalculation {
  pendingRewards: bigint
  claimableRewards: bigint
  lockedRewards: bigint
  nextUnlockTime: bigint
  apr: number
}

/**
 * Pool statistics
 */
export interface PoolStats {
  totalStaked: bigint
  totalStakers: number
  totalRewardsDistributed: bigint
  currentApr: number
  remainingRewards: bigint
  timeUntilEmpty: bigint
}
