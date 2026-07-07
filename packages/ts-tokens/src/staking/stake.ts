/**
 * Staking Operations
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey, Keypair, Transaction } from '@solana/web3.js'
import type {
  StakeInfo,
  NFTStakeInfo,
  StakeOptions,
  UnstakeOptions,
  ClaimOptions,
  StakeNFTOptions,
  UnstakeNFTOptions,
  RewardsCalculation,
} from './types'
import { getPool, calculatePendingRewards, calculatePenalty, calculateAPR } from './pool'

/**
 * Get stake info for a user
 */
export async function getStakeInfo(
  connection: Connection,
  stakeAccount: PublicKey
): Promise<StakeInfo | null> {
  const accountInfo = await connection.getAccountInfo(stakeAccount)

  if (!accountInfo) {
    return null
  }

  const data = accountInfo.data

  return {
    owner: new PublicKey(data.subarray(8, 40)),
    pool: new PublicKey(data.subarray(40, 72)),
    amount: data.readBigUInt64LE(72),
    rewardDebt: data.readBigUInt64LE(80),
    stakedAt: data.readBigUInt64LE(88),
    lastClaimTime: data.readBigUInt64LE(96),
    lockEndTime: data.readBigUInt64LE(104),
  }
}

/**
 * Get all stakes for a user in a pool
 */
export async function getUserStakes(
  connection: Connection,
  pool: PublicKey,
  owner: PublicKey
): Promise<StakeInfo[]> {
  const { STAKING_PROGRAM_ID, isAccountNotFoundError } = await import('./program')
  try {
    const accounts = await connection.getProgramAccounts(STAKING_PROGRAM_ID, {
      filters: [
        { dataSize: 112 },
        { memcmp: { offset: 8, bytes: owner.toBase58() } },
        { memcmp: { offset: 40, bytes: pool.toBase58() } },
      ],
    })

    return accounts.map(({ account }) => ({
      owner: new PublicKey(account.data.subarray(8, 40)),
      pool: new PublicKey(account.data.subarray(40, 72)),
      amount: account.data.readBigUInt64LE(72),
      rewardDebt: account.data.readBigUInt64LE(80),
      stakedAt: account.data.readBigUInt64LE(88),
      lastClaimTime: account.data.readBigUInt64LE(96),
      lockEndTime: account.data.readBigUInt64LE(104),
    }))
  } catch (error) {
    if (isAccountNotFoundError(error)) {
      return []
    }
    throw error
  }
}

/**
 * Calculate rewards for a stake
 */
export async function calculateRewards(
  connection: Connection,
  stakeAccount: PublicKey
): Promise<RewardsCalculation | null> {
  const stakeInfo = await getStakeInfo(connection, stakeAccount)

  if (!stakeInfo) {
    return null
  }

  const pool = await getPool(connection, stakeInfo.pool)

  if (!pool) {
    return null
  }

  const currentTime = BigInt(Math.floor(Date.now() / 1000))
  const pendingRewards = calculatePendingRewards(
    pool,
    stakeInfo.amount,
    stakeInfo.rewardDebt,
    currentTime
  )

  const isLocked = currentTime < stakeInfo.lockEndTime
  const claimableRewards = isLocked ? 0n : pendingRewards
  const lockedRewards = isLocked ? pendingRewards : 0n

  // Calculate APR using the real mint decimals so reward-token and
  // stake-token base units are normalized before the ratio is taken.
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

  return {
    pendingRewards,
    claimableRewards,
    lockedRewards,
    nextUnlockTime: stakeInfo.lockEndTime,
    apr,
  }
}

/**
 * Check if user can unstake
 */
export async function canUnstake(
  connection: Connection,
  stakeAccount: PublicKey
): Promise<{ canUnstake: boolean; reason?: string; penalty?: bigint }> {
  const stakeInfo = await getStakeInfo(connection, stakeAccount)

  if (!stakeInfo) {
    return { canUnstake: false, reason: 'Stake account not found' }
  }

  const pool = await getPool(connection, stakeInfo.pool)

  if (!pool) {
    return { canUnstake: false, reason: 'Pool not found' }
  }

  if (pool.paused) {
    return { canUnstake: false, reason: 'Pool is paused' }
  }

  const currentTime = BigInt(Math.floor(Date.now() / 1000))

  if (currentTime < stakeInfo.lockEndTime) {
    // Penalize against the stake's actual lock window (stakedAt -> lockEndTime),
    // not the pool-wide minStakeDuration. A user who self-locked for longer than
    // minStakeDuration is still inside their lock, so must see a real penalty.
    const lockDuration = stakeInfo.lockEndTime - stakeInfo.stakedAt
    const penalty = calculatePenalty(
      stakeInfo.amount,
      pool.earlyUnstakePenalty,
      stakeInfo.stakedAt,
      lockDuration,
      currentTime
    )

    return {
      canUnstake: true,
      reason: 'Early unstake will incur penalty',
      penalty,
    }
  }

  return { canUnstake: true }
}

/**
 * Get NFT stake info
 */
export async function getNFTStakeInfo(
  connection: Connection,
  stakeAccount: PublicKey
): Promise<NFTStakeInfo | null> {
  const accountInfo = await connection.getAccountInfo(stakeAccount)

  if (!accountInfo) {
    return null
  }

  const data = accountInfo.data

  return {
    owner: new PublicKey(data.subarray(8, 40)),
    pool: new PublicKey(data.subarray(40, 72)),
    mint: new PublicKey(data.subarray(72, 104)),
    stakedAt: data.readBigUInt64LE(104),
    lastClaimTime: data.readBigUInt64LE(112),
    lockEndTime: data.readBigUInt64LE(120),
    pointsEarned: data.readBigUInt64LE(128),
  }
}

/**
 * Calculate NFT staking points
 */
export function calculateNFTPoints(
  stakedAt: bigint,
  lastClaimTime: bigint,
  pointsPerDay: bigint,
  currentTime: bigint
): bigint {
  const startTime = lastClaimTime > stakedAt ? lastClaimTime : stakedAt
  const duration = currentTime - startTime
  const secondsPerDay = 24n * 60n * 60n

  return (duration * pointsPerDay) / secondsPerDay
}

/**
 * Get all staked NFTs for a user
 */
export async function getUserStakedNFTs(
  connection: Connection,
  pool: PublicKey,
  owner: PublicKey
): Promise<NFTStakeInfo[]> {
  const { STAKING_PROGRAM_ID, isAccountNotFoundError } = await import('./program')
  try {
    const accounts = await connection.getProgramAccounts(STAKING_PROGRAM_ID, {
      filters: [
        { dataSize: 136 },
        { memcmp: { offset: 8, bytes: owner.toBase58() } },
        { memcmp: { offset: 40, bytes: pool.toBase58() } },
      ],
    })

    return accounts.map(({ account }) => ({
      owner: new PublicKey(account.data.subarray(8, 40)),
      pool: new PublicKey(account.data.subarray(40, 72)),
      mint: new PublicKey(account.data.subarray(72, 104)),
      stakedAt: account.data.readBigUInt64LE(104),
      lastClaimTime: account.data.readBigUInt64LE(112),
      lockEndTime: account.data.readBigUInt64LE(120),
      pointsEarned: account.data.readBigUInt64LE(128),
    }))
  } catch (error) {
    if (isAccountNotFoundError(error)) {
      return []
    }
    throw error
  }
}

/**
 * Validate stake amount
 */
export function validateStakeAmount(
  amount: bigint,
  balance: bigint,
  minStake?: bigint
): { valid: boolean; error?: string } {
  if (amount <= 0n) {
    return { valid: false, error: 'Amount must be greater than 0' }
  }

  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance' }
  }

  if (minStake && amount < minStake) {
    return { valid: false, error: `Minimum stake is ${minStake}` }
  }

  return { valid: true }
}

/**
 * Format stake duration
 */
export function formatDuration(seconds: bigint): string {
  const days = Number(seconds / 86400n)
  const hours = Number((seconds % 86400n) / 3600n)
  const minutes = Number((seconds % 3600n) / 60n)

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
