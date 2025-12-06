/**
 * Quadratic Voting
 *
 * Vote weight = √(tokens)
 * Reduces plutocracy by making additional votes increasingly expensive.
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type {
  QuadraticVotingConfig,
  VotingPower,
} from './types'

/**
 * Calculate quadratic voting power
 * Vote weight = √(token balance)
 */
export function calculateQuadraticPower(tokenBalance: bigint): bigint {
  if (tokenBalance <= 0n)
    return 0n

  // Integer square root using Newton's method
  let x = tokenBalance
  let y = (x + 1n) / 2n

  while (y < x) {
    x = y
    y = (x + tokenBalance / x) / 2n
  }

  return x
}

/**
 * Get quadratic voting power for a voter
 */
export async function getQuadraticVotingPower(
  connection: Connection,
  voter: PublicKey,
  config: QuadraticVotingConfig,
): Promise<VotingPower> {
  // Get token balance
  const tokenAccounts = await connection.getTokenAccountsByOwner(voter, {
    mint: config.token,
  })

  let totalBalance = 0n
  for (const { account } of tokenAccounts.value) {
    // Would parse account data
    totalBalance += 0n
  }

  const quadraticPower = calculateQuadraticPower(totalBalance)

  // Apply max votes limit if configured
  let finalPower = quadraticPower
  if (config.maxVotesPerVoter && quadraticPower > config.maxVotesPerVoter) {
    finalPower = config.maxVotesPerVoter
  }

  return {
    own: finalPower,
    delegated: 0n,
    total: finalPower,
    mechanism: 'quadratic',
  }
}

/**
 * Calculate cost to cast N votes in quadratic voting
 * Cost = N² tokens
 */
export function calculateVoteCost(votes: bigint): bigint {
  return votes * votes
}

/**
 * Calculate votes from token amount
 */
export function calculateVotesFromTokens(tokens: bigint): bigint {
  return calculateQuadraticPower(tokens)
}

/**
 * Calculate tokens needed for N votes
 */
export function calculateTokensNeeded(votes: bigint): bigint {
  return votes * votes
}

/**
 * Simulate quadratic voting distribution
 */
export function simulateQuadraticDistribution(
  balances: bigint[],
): { voter: number, balance: bigint, votes: bigint, percentage: number }[] {
  const results = balances.map((balance, i) => ({
    voter: i,
    balance,
    votes: calculateQuadraticPower(balance),
  }))

  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0n)

  return results.map(r => ({
    ...r,
    percentage: totalVotes > 0n ? Number((r.votes * 10000n) / totalVotes) / 100 : 0,
  }))
}

/**
 * Compare linear vs quadratic voting power
 */
export function compareVotingMechanisms(balances: bigint[]): {
  linear: { gini: number, top10Percentage: number }
  quadratic: { gini: number, top10Percentage: number }
} {
  const sorted = [...balances].sort((a, b) => Number(b - a))
  const totalLinear = sorted.reduce((a, b) => a + b, 0n)

  const quadraticPowers = sorted.map(b => calculateQuadraticPower(b))
  const totalQuadratic = quadraticPowers.reduce((a, b) => a + b, 0n)

  // Top 10 percentage
  const top10Linear = sorted.slice(0, 10).reduce((a, b) => a + b, 0n)
  const top10Quadratic = quadraticPowers.slice(0, 10).reduce((a, b) => a + b, 0n)

  return {
    linear: {
      gini: calculateGini(sorted.map(Number)),
      top10Percentage: totalLinear > 0n ? Number((top10Linear * 100n) / totalLinear) : 0,
    },
    quadratic: {
      gini: calculateGini(quadraticPowers.map(Number)),
      top10Percentage: totalQuadratic > 0n ? Number((top10Quadratic * 100n) / totalQuadratic) : 0,
    },
  }
}

/**
 * Calculate Gini coefficient
 */
function calculateGini(values: number[]): number {
  if (values.length === 0)
    return 0

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const sum = sorted.reduce((a, b) => a + b, 0)

  if (sum === 0)
    return 0

  let numerator = 0
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sorted[i]
  }

  return numerator / (n * sum)
}

/**
 * Format quadratic voting power
 */
export function formatQuadraticPower(
  tokenBalance: bigint,
  decimals: number = 9,
): string {
  const tokens = Number(tokenBalance) / 10 ** decimals
  const votes = calculateQuadraticPower(tokenBalance)

  return [
    `Token Balance: ${tokens.toLocaleString()}`,
    `Voting Power: ${votes.toString()}`,
    `Effective Rate: ${(Number(votes) / tokens * 100).toFixed(2)}%`,
  ].join('\n')
}
