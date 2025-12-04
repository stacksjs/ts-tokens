/**
 * Staking Pool Management
 */

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js'
import type {
  StakingPool,
  NFTStakingPool,
  CreatePoolOptions,
  CreateNFTPoolOptions,
  PoolStats,
} from './types'

/**
 * Get staking pool info
 */
export async function getPool(
  connection: Connection,
  poolAddress: PublicKey
): Promise<StakingPool | null> {
  const accountInfo = await connection.getAccountInfo(poolAddress)

  if (!accountInfo) {
    return null
  }

  // Parse pool data (simplified - actual implementation depends on program)
  const data = accountInfo.data

  return {
    address: poolAddress,
    authority: new PublicKey(data.subarray(8, 40)),
    stakeMint: new PublicKey(data.subarray(40, 72)),
    rewardMint: new PublicKey(data.subarray(72, 104)),
    totalStaked: data.readBigUInt64LE(104),
    rewardRate: data.readBigUInt64LE(112),
    rewardDuration: data.readBigUInt64LE(120),
    lastUpdateTime: data.readBigUInt64LE(128),
    rewardPerTokenStored: data.readBigUInt64LE(136),
    minStakeDuration: data.readBigUInt64LE(144),
    earlyUnstakePenalty: data.readUInt16LE(152),
    paused: data[154] === 1,
  }
}

/**
 * Get pool statistics
 */
export async function getPoolStats(
  connection: Connection,
  poolAddress: PublicKey
): Promise<PoolStats | null> {
  const pool = await getPool(connection, poolAddress)

  if (!pool) {
    return null
  }

  // Calculate APR
  const yearInSeconds = 365n * 24n * 60n * 60n
  const rewardsPerYear = pool.rewardRate * yearInSeconds
  const apr = pool.totalStaked > 0n
    ? Number((rewardsPerYear * 10000n) / pool.totalStaked) / 100
    : 0

  // Calculate time until rewards empty
  const rewardBalance = 0n // Would fetch from reward vault
  const timeUntilEmpty = pool.rewardRate > 0n
    ? rewardBalance / pool.rewardRate
    : 0n

  return {
    totalStaked: pool.totalStaked,
    totalStakers: 0, // Would need to count stake accounts
    totalRewardsDistributed: 0n, // Would track separately
    currentApr: apr,
    remainingRewards: rewardBalance,
    timeUntilEmpty,
  }
}

/**
 * Calculate pending rewards for a staker
 */
export function calculatePendingRewards(
  pool: StakingPool,
  stakedAmount: bigint,
  rewardDebt: bigint,
  currentTime: bigint
): bigint {
  if (pool.totalStaked === 0n) {
    return 0n
  }

  const timeDelta = currentTime - pool.lastUpdateTime
  const newRewards = (pool.rewardRate * timeDelta * stakedAmount) / pool.totalStaked
  const totalRewards = (stakedAmount * pool.rewardPerTokenStored) / BigInt(1e18) + newRewards

  return totalRewards > rewardDebt ? totalRewards - rewardDebt : 0n
}

/**
 * Calculate APR for a pool
 */
export function calculateAPR(
  rewardRate: bigint,
  totalStaked: bigint,
  rewardDecimals: number,
  stakeDecimals: number
): number {
  if (totalStaked === 0n) {
    return 0
  }

  const yearInSeconds = 365 * 24 * 60 * 60
  const rewardsPerYear = Number(rewardRate) * yearInSeconds
  const rewardsPerYearNormalized = rewardsPerYear / Math.pow(10, rewardDecimals)
  const totalStakedNormalized = Number(totalStaked) / Math.pow(10, stakeDecimals)

  return (rewardsPerYearNormalized / totalStakedNormalized) * 100
}

/**
 * Calculate early unstake penalty
 */
export function calculatePenalty(
  amount: bigint,
  penaltyBps: number,
  stakedAt: bigint,
  minDuration: bigint,
  currentTime: bigint
): bigint {
  const stakeDuration = currentTime - stakedAt

  if (stakeDuration >= minDuration) {
    return 0n
  }

  // Linear penalty based on remaining lock time
  const remainingTime = minDuration - stakeDuration
  const penaltyRatio = (remainingTime * BigInt(penaltyBps)) / minDuration
  const penalty = (amount * penaltyRatio) / 10000n

  return penalty
}

/**
 * Validate pool configuration
 */
export function validatePoolConfig(options: CreatePoolOptions): string[] {
  const errors: string[] = []

  if (options.rewardRate <= 0n) {
    errors.push('Reward rate must be greater than 0')
  }

  if (options.rewardDuration <= 0n) {
    errors.push('Reward duration must be greater than 0')
  }

  if (options.earlyUnstakePenalty && (options.earlyUnstakePenalty < 0 || options.earlyUnstakePenalty > 10000)) {
    errors.push('Early unstake penalty must be between 0 and 10000 basis points')
  }

  return errors
}
