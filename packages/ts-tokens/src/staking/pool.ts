/**
 * Staking Pool Management
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey, Keypair, Transaction } from '@solana/web3.js'
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

  // Calculate APR using the real mint decimals so reward-token and stake-token
  // base units are normalized before the ratio is taken (they differ by
  // 10^(decimalsΔ) when the mints have different decimals).
  const { getMintWithProgram } = await import('../token/program')
  const [stakeMintInfo, rewardMintInfo] = await Promise.all([
    getMintWithProgram(connection, pool.stakeMint),
    getMintWithProgram(connection, pool.rewardMint),
  ])
  const apr = calculateAPR(
    pool.rewardRate,
    pool.totalStaked,
    rewardMintInfo.mint.decimals,
    stakeMintInfo.mint.decimals
  )

  // Fetch actual reward vault balance
  const { getRewardVaultAddress } = await import('./program')
  const rewardVaultAddress = getRewardVaultAddress(poolAddress)
  const { isAccountNotFoundError } = await import('./program')
  let rewardBalance = 0n
  try {
    const vaultBalance = await connection.getTokenAccountBalance(rewardVaultAddress)
    rewardBalance = BigInt(vaultBalance.value.amount)
  } catch (error) {
    // A genuinely-absent vault means zero balance; rethrow real RPC failures.
    if (!isAccountNotFoundError(error)) {
      throw error
    }
  }

  const timeUntilEmpty = pool.rewardRate > 0n
    ? rewardBalance / pool.rewardRate
    : 0n

  // Count unique stakers efficiently (zero-length data slice)
  const { STAKING_PROGRAM_ID } = await import('./program')
  let totalStakers = 0
  try {
    const stakeAccounts = await connection.getProgramAccounts(STAKING_PROGRAM_ID, {
      filters: [
        { dataSize: 112 },
        { memcmp: { offset: 40, bytes: poolAddress.toBase58() } },
      ],
      dataSlice: { offset: 0, length: 0 },
    })
    totalStakers = stakeAccounts.length
  } catch (error) {
    // No stake accounts yet is fine; rethrow real RPC failures so an outage is
    // not silently reported as zero stakers.
    if (!isAccountNotFoundError(error)) {
      throw error
    }
  }

  return {
    totalStaked: pool.totalStaked,
    totalStakers,
    // Not tracked: there is no on-chain counter of cumulative distributions,
    // and reconstructing one from reward-vault deltas is not implemented.
    // Reported as null (not a fabricated 0n) so callers can distinguish
    // "no rewards distributed" from "not measured".
    totalRewardsDistributed: null,
    currentApr: apr,
    remainingRewards: rewardBalance,
    timeUntilEmpty,
  }
}

/**
 * Calculate pending rewards for a staker.
 *
 * Rewards stop accruing at the end of the pool's reward period
 * (`lastUpdateTime + rewardDuration`): without clamping, a `currentTime`
 * past the period finish would keep minting rewards the vault never
 * funded. A `currentTime` before `lastUpdateTime` (clock skew) yields no
 * new rewards.
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

  const rewardEnd = pool.lastUpdateTime + pool.rewardDuration
  const effectiveTime = currentTime < rewardEnd ? currentTime : rewardEnd
  const timeDelta = effectiveTime > pool.lastUpdateTime
    ? effectiveTime - pool.lastUpdateTime
    : 0n
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
