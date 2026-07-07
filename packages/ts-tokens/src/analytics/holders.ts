/**
 * Holder Analytics
 */

import { PublicKey } from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token'
import type { TokenHolder, HolderDistribution, HolderSnapshot } from './types'

/** SPL token account offsets/size (base Token program layout). */
const TOKEN_ACCOUNT_SIZE = 165
const MINT_OFFSET = 0
const OWNER_OFFSET = 32

/**
 * Get token holder distribution.
 *
 * Enumerates every SPL token account for the mint via `getProgramAccounts`
 * (memcmp on the mint at offset 0, filtered to the 165-byte account size),
 * aggregates balances by owner, and computes the reported metrics over the
 * complete holder set. When a `limit` is supplied, only the returned
 * `holders` list is truncated (to the largest N); `totalHolders`, the top-10/
 * top-100 percentages, and the Gini coefficient are always computed from the
 * full set so they are not understated.
 */
export async function getHolderDistribution(
  connection: Connection,
  mint: PublicKey,
  options: { limit?: number } = {}
): Promise<HolderDistribution> {
  const { limit } = options

  // Enumerate all token accounts for this mint (classic SPL Token program).
  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      { dataSize: TOKEN_ACCOUNT_SIZE },
      { memcmp: { offset: MINT_OFFSET, bytes: mint.toBase58() } },
    ],
  })

  // Aggregate balances by owner (a single owner can hold multiple token
  // accounts for the same mint). Retain one representative token account per
  // owner for the `tokenAccount` field.
  const balancesByOwner = new Map<string, bigint>()
  const tokenAccountByOwner = new Map<string, string>()
  for (const { pubkey, account } of accounts) {
    const decoded = AccountLayout.decode(account.data.subarray(0, AccountLayout.span))
    const owner = new PublicKey(account.data.subarray(OWNER_OFFSET, OWNER_OFFSET + 32)).toBase58()
    const amount = BigInt(decoded.amount.toString())
    if (amount > 0n) {
      balancesByOwner.set(owner, (balancesByOwner.get(owner) ?? 0n) + amount)
      if (!tokenAccountByOwner.has(owner)) {
        tokenAccountByOwner.set(owner, pubkey.toBase58())
      }
    }
  }

  // Get mint supply.
  const mintInfo = await connection.getParsedAccountInfo(mint)
  const mintData = mintInfo.value?.data
  let totalSupply = 0n
  if (mintData && 'parsed' in mintData) {
    totalSupply = BigInt(mintData.parsed.info.supply)
  }

  // Sorted full holder set (descending by balance).
  const sortedOwners = Array.from(balancesByOwner.entries())
    .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))

  const totalHolders = sortedOwners.length

  // Build the ranked holder list. Only this list honors `limit`; metrics below
  // are computed over the complete set.
  const rankedCount = limit !== undefined ? Math.min(sortedOwners.length, limit) : sortedOwners.length
  if (limit !== undefined && limit < sortedOwners.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `getHolderDistribution: returning ${rankedCount} of ${sortedOwners.length} ` +
      'holders (limited); aggregate metrics still reflect all holders.'
    )
  }

  const holders: TokenHolder[] = []
  for (let i = 0; i < rankedCount; i++) {
    const [owner, balance] = sortedOwners[i]
    const ownerPubkey = new PublicKey(owner)
    const tokenAccount = tokenAccountByOwner.get(owner)
    holders.push({
      address: ownerPubkey,
      balance,
      percentage: totalSupply > 0n ? Number((balance * 10000n) / totalSupply) / 100 : 0,
      rank: i + 1,
      tokenAccount: tokenAccount ? new PublicKey(tokenAccount) : ownerPubkey,
    })
  }

  // Metrics over the full holder set.
  const top10Holdings = sortedOwners.slice(0, 10).reduce((sum, [, b]) => sum + b, 0n)
  const top100Holdings = sortedOwners.slice(0, 100).reduce((sum, [, b]) => sum + b, 0n)

  const top10Percentage = totalSupply > 0n
    ? Number((top10Holdings * 10000n) / totalSupply) / 100
    : 0

  const top100Percentage = totalSupply > 0n
    ? Number((top100Holdings * 10000n) / totalSupply) / 100
    : 0

  const gini = calculateGiniCoefficient(sortedOwners.map(([, b]) => Number(b)))

  return {
    mint,
    totalSupply,
    circulatingSupply: totalSupply, // Would need to exclude locked tokens
    holders,
    totalHolders,
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
  // Fetch the complete holder set (no limit) so the median reflects all
  // holders rather than only the top 100.
  const distribution = await getHolderDistribution(connection, mint)

  const top10Holdings = distribution.holders
    .slice(0, 10)
    .reduce((sum, h) => sum + h.balance, 0n)

  const top100Holdings = distribution.holders
    .slice(0, 100)
    .reduce((sum, h) => sum + h.balance, 0n)

  // Calculate median over the full holder set.
  const balances = distribution.holders.map(h => h.balance).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
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
