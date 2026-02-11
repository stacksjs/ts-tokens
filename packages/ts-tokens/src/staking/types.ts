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

/**
 * Update pool options
 */
export interface UpdatePoolOptions {
  pool: PublicKey
  rewardRate?: bigint
  rewardDuration?: bigint
  minStakeDuration?: bigint
  earlyUnstakePenalty?: number
}

/**
 * Compound rewards options
 */
export interface CompoundOptions {
  pool: PublicKey
}

/**
 * Emergency unstake options
 */
export interface EmergencyUnstakeOptions {
  pool: PublicKey
}

/**
 * Fund rewards options
 */
export interface FundRewardsOptions {
  pool: PublicKey
  amount: bigint
}

/**
 * Withdraw rewards options
 */
export interface WithdrawRewardsOptions {
  pool: PublicKey
  amount: bigint
}

/**
 * Close pool options
 */
export interface ClosePoolOptions {
  pool: PublicKey
}

/**
 * Staking transaction result
 */
export interface StakingResult {
  signature: string
  confirmed: boolean
  pool?: string
  stakeEntry?: string
  amount?: bigint
  error?: string
}

/**
 * Claim rewards result
 */
export interface ClaimResult {
  signature: string
  confirmed: boolean
  rewardsClaimed: bigint
  error?: string
}

/**
 * Claim NFT rewards options
 */
export interface ClaimNFTRewardsOptions {
  pool: PublicKey
  mint: PublicKey
}

/**
 * Rarity multiplier for NFT staking
 */
export interface RarityMultiplier {
  trait: string
  value: string
  multiplier: number
}

/**
 * Trait bonus for NFT staking
 */
export interface TraitBonus {
  traits: string[]
  bonusMultiplier: number
}

/**
 * NFT pool config (extends CreateNFTPoolOptions)
 */
export interface NFTPoolConfig extends CreateNFTPoolOptions {
  rarityMultipliers?: RarityMultiplier[]
  traitBonuses?: TraitBonus[]
}

/**
 * Liquid staking pool
 */
export interface LiquidStakingPool {
  address: PublicKey
  authority: PublicKey
  stakeMint: PublicKey
  receiptMint: PublicKey
  totalStaked: bigint
  totalReceiptSupply: bigint
  exchangeRate: number
  paused: boolean
}

/**
 * Create liquid staking pool options
 */
export interface CreateLiquidPoolOptions {
  stakeMint: PublicKey
}

/**
 * Liquid stake options
 */
export interface LiquidStakeOptions {
  pool: PublicKey
  amount: bigint
}

/**
 * Liquid unstake options
 */
export interface LiquidUnstakeOptions {
  pool: PublicKey
  receiptAmount: bigint
}

/**
 * Staking history entry
 */
export interface StakingHistoryEntry {
  timestamp: number
  action: 'stake' | 'unstake' | 'claim' | 'compound'
  amount: bigint
  signature: string
  pool: string
}

/**
 * Staking performance metrics
 */
export interface StakingPerformance {
  totalStaked: bigint
  totalRewardsClaimed: bigint
  currentlyStaked: bigint
  averageStakeDuration: number
  currentApr: number
}

/**
 * Earnings history
 */
export interface EarningsHistory {
  period: string
  entries: Array<{
    date: string
    earned: bigint
    cumulative: bigint
  }>
  totalEarned: bigint
}
