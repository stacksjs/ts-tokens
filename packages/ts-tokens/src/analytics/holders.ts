/**
 * Holder Analytics
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { TokenHolder, HolderDistribution, HolderSnapshot } from './types'

/**
 * Get token holder distribution
 */
export async function getHolderDistribution(
  connection: Connection,
  mint: PublicKey,
  options: { limit?: number } = {}
): Promise<HolderDistribution> {
  const { limit = 100 } = options

  // Get largest token accounts
  const largestAccounts = await connection.getTokenLargestAccounts(mint)

  // Get mint info for supply
  const mintInfo = await connection.getParsedAccountInfo(mint)
  const mintData = mintInfo.value?.data

  let totalSupply = 0n
  if (mintData && 'parsed' in mintData) {
    totalSupply = BigInt(mintData.parsed.info.supply)
  }

  // Build holder list
  const holders: TokenHolder[] = []
  let runningTotal = 0n

  for (let i = 0; i < Math.min(largestAccounts.value.length, limit); i++) {
    const account = largestAccounts.value[i]
    const balance = BigInt(account.amount)
    runningTotal += balance

    holders.push({
      address: account.address, // This is the token account, not owner
      balance,
      percentage: totalSupply > 0n ? Number((balance * 10000n) / totalSupply) / 100 : 0,
      rank: i + 1,
      tokenAccount: account.address,
    })
  }

  // Calculate metrics
  const top10 = holders.slice(0, 10)
  const top100 = holders.slice(0, 100)

  const top10Holdings = top10.reduce((sum, h) => sum + h.balance, 0n)
  const top100Holdings = top100.reduce((sum, h) => sum + h.balance, 0n)

  const top10Percentage = totalSupply > 0n
    ? Number((top10Holdings * 10000n) / totalSupply) / 100
    : 0

  const top100Percentage = totalSupply > 0n
    ? Number((top100Holdings * 10000n) / totalSupply) / 100
    : 0

  // Calculate Gini coefficient (simplified)
  const gini = calculateGiniCoefficient(holders.map(h => Number(h.balance)))

  return {
    mint,
    totalSupply,
    circulatingSupply: totalSupply, // Would need to exclude locked tokens
    holders,
    totalHolders: largestAccounts.value.length,
    top10Percentage,
    top100Percentage,
    giniCoefficient: gini,
    timestamp: Date.now(),
  }
}

/**
 * Calculate Gini coefficient for wealth distribution
 * 0 = perfect equality, 1 = perfect inequality
 */
function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const sum = sorted.reduce((a, b) => a + b, 0)

  if (sum === 0) return 0

  let numerator = 0
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sorted[i]
  }

  return numerator / (n * sum)
}

/**
 * Get holder snapshot for a point in time
 */
export async function getHolderSnapshot(
  connection: Connection,
  mint: PublicKey
): Promise<HolderSnapshot> {
  const distribution = await getHolderDistribution(connection, mint, { limit: 100 })

  const top10Holdings = distribution.holders
    .slice(0, 10)
    .reduce((sum, h) => sum + h.balance, 0n)

  const top100Holdings = distribution.holders
    .slice(0, 100)
    .reduce((sum, h) => sum + h.balance, 0n)

  // Calculate median
  const balances = distribution.holders.map(h => h.balance).sort((a, b) => Number(a - b))
  const medianHolding = balances.length > 0
    ? balances[Math.floor(balances.length / 2)]
    : 0n

  return {
    mint,
    timestamp: Date.now(),
    totalHolders: distribution.totalHolders,
    top10Holdings,
    top100Holdings,
    medianHolding,
  }
}

/**
 * Track holder changes between snapshots
 */
export function compareSnapshots(
  before: HolderSnapshot,
  after: HolderSnapshot
): {
  holderChange: number
  holderChangePercentage: number
  concentrationChange: number
} {
  const holderChange = after.totalHolders - before.totalHolders
  const holderChangePercentage = before.totalHolders > 0
    ? (holderChange / before.totalHolders) * 100
    : 0

  const beforeConcentration = before.top10Holdings
  const afterConcentration = after.top10Holdings
  const concentrationChange = Number(afterConcentration - beforeConcentration)

  return {
    holderChange,
    holderChangePercentage,
    concentrationChange,
  }
}

/**
 * Identify whale wallets
 */
export function identifyWhales(
  distribution: HolderDistribution,
  thresholdPercentage: number = 1
): TokenHolder[] {
  return distribution.holders.filter(h => h.percentage >= thresholdPercentage)
}

/**
 * Format holder distribution for display
 */
export function formatHolderDistribution(distribution: HolderDistribution): string {
  const lines = [
    `Token: ${distribution.mint.toBase58()}`,
    `Total Supply: ${distribution.totalSupply}`,
    `Total Holders: ${distribution.totalHolders}`,
    `Top 10 Hold: ${distribution.top10Percentage.toFixed(2)}%`,
    `Top 100 Hold: ${distribution.top100Percentage.toFixed(2)}%`,
    `Gini Coefficient: ${distribution.giniCoefficient.toFixed(4)}`,
    '',
    'Top Holders:',
    ...distribution.holders.slice(0, 10).map(h =>
      `  ${h.rank}. ${h.address.toBase58().slice(0, 8)}... - ${h.percentage.toFixed(2)}%`
    ),
  ]

  return lines.join('\n')
}

/**
 * Export holders to CSV format
 */
export function exportHoldersToCSV(distribution: HolderDistribution): string {
  const headers = 'Rank,Address,Balance,Percentage'
  const rows = distribution.holders.map(h =>
    `${h.rank},${h.address.toBase58()},${h.balance},${h.percentage}`
  )

  return [headers, ...rows].join('\n')
}
