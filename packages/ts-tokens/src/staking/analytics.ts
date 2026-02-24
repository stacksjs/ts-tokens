/**
 * Staking Analytics
 *
 * History, performance metrics, earnings tracking, and data export.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type {
  StakingHistoryEntry,
  StakingPerformance,
  EarningsHistory,
} from './types'
import { STAKING_PROGRAM_ID, getStakeEntryAddress } from './program'

/**
 * Get staking history for a user in a pool
 */
export async function getStakingHistory(
  connection: Connection,
  pool: PublicKey,
  owner: PublicKey
): Promise<StakingHistoryEntry[]> {
  const stakeEntry = getStakeEntryAddress(pool, owner)
  const signatures = await connection.getSignaturesForAddress(stakeEntry, { limit: 100 })

  return signatures.map(sig => ({
    timestamp: sig.blockTime ?? 0,
    action: 'stake' as const, // Simplified — full impl would parse tx data
    amount: 0n,
    signature: sig.signature,
    pool: pool.toBase58(),
  }))
}

/**
 * Get staking performance metrics for a user
 */
export async function getStakingPerformance(
  connection: Connection,
  pool: PublicKey,
  owner: PublicKey
): Promise<StakingPerformance> {
  const { getPool } = await import('./pool')
  const { getStakeInfo } = await import('./stake')
  const { getStakeEntryAddress } = await import('./program')
  const { calculateAPR } = await import('./pool')

  const poolData = await getPool(connection, pool)
  const stakeEntry = getStakeEntryAddress(pool, owner)
  const stakeInfo = await getStakeInfo(connection, stakeEntry)

  const currentlyStaked = stakeInfo?.amount ?? 0n
  const apr = poolData
    ? calculateAPR(poolData.rewardRate, poolData.totalStaked, 9, 9)
    : 0

  const history = await getStakingHistory(connection, pool, owner)
  const avgDuration = history.length > 0
    ? (Date.now() / 1000 - (history[history.length - 1]?.timestamp ?? 0)) / history.length
    : 0

  return {
    totalStaked: currentlyStaked,
    totalRewardsClaimed: 0n, // Would need full tx parsing
    currentlyStaked,
    averageStakeDuration: avgDuration,
    currentApr: apr,
  }
}

/**
 * Get earnings history for a user over a time period
 */
export async function getEarningsHistory(
  connection: Connection,
  pool: PublicKey,
  owner: PublicKey,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<EarningsHistory> {
  const history = await getStakingHistory(connection, pool, owner)

  const claimEntries = history.filter(h => h.action === 'claim')
  let cumulative = 0n

  const entries = claimEntries.map(entry => {
    cumulative += entry.amount
    return {
      date: new Date(entry.timestamp * 1000).toISOString().split('T')[0],
      earned: entry.amount,
      cumulative,
    }
  })

  return {
    period,
    entries,
    totalEarned: cumulative,
  }
}

/**
 * Export staking data in CSV or JSON format
 */
export function exportStakingData(
  history: StakingHistoryEntry[],
  format: 'csv' | 'json'
): string {
  if (format === 'json') {
    return JSON.stringify(
      history.map(h => ({
        ...h,
        amount: h.amount.toString(),
      })),
      null,
      2
    )
  }

  // CSV format
  const header = 'timestamp,action,amount,signature,pool'
  const rows = history.map(h =>
    `${h.timestamp},${h.action},${h.amount.toString()},${h.signature},${h.pool}`
  )
  return [header, ...rows].join('\n')
}

/**
 * Get pool-level analytics
 */
// eslint-disable-next-line no-unused-vars
export async function getPoolAnalytics(
  connection: Connection,
  pool: PublicKey
): Promise<{
  tvl: bigint
  uniqueStakers: number
  averageStake: bigint
  medianStake: bigint
}> {
  const accounts = await connection.getProgramAccounts(STAKING_PROGRAM_ID, {
    filters: [
      { dataSize: 112 },
      { memcmp: { offset: 40, bytes: pool.toBase58() } },
    ],
  })

  const stakes = accounts
    .map(({ account }) => account.data.readBigUInt64LE(72))
    .filter(amount => amount > 0n)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  const tvl = stakes.reduce((sum, s) => sum + s, 0n)
  const uniqueStakers = stakes.length

  const averageStake = uniqueStakers > 0
    ? tvl / BigInt(uniqueStakers)
    : 0n

  const medianStake = uniqueStakers > 0
    ? stakes[Math.floor(uniqueStakers / 2)]
    : 0n

  return { tvl, uniqueStakers, averageStake, medianStake }
}
