/**
 * Voting Mechanism Tests
 *
 * Tests for quadratic voting and token-weighted voting pure functions.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import {
  calculateQuadraticPower,
  calculateVoteCost,
  calculateVotesFromTokens,
  calculateTokensNeeded,
  simulateQuadraticDistribution,
  compareVotingMechanisms,
  formatQuadraticPower,
} from '../src/voting/quadratic'
import {
  validateTokenWeightedVote,
  formatTokenWeightedPower,
} from '../src/voting/token-weighted'
import type { VotingPower } from '../src/voting/types'

describe('calculateQuadraticPower', () => {
  test('should return correct integer sqrt for perfect squares', () => {
    expect(calculateQuadraticPower(100n)).toBe(10n)
    expect(calculateQuadraticPower(10000n)).toBe(100n)
    expect(calculateQuadraticPower(1000000n)).toBe(1000n)
  })

  test('should return 0 for zero or negative balance', () => {
    expect(calculateQuadraticPower(0n)).toBe(0n)
    expect(calculateQuadraticPower(-100n)).toBe(0n)
    expect(calculateQuadraticPower(-1n)).toBe(0n)
  })

  test('should handle large numbers correctly', () => {
    // 10^18 is a common token supply; sqrt = 10^9
    const balance = 1000000000000000000n
    expect(calculateQuadraticPower(balance)).toBe(1000000000n)
  })

  test('should floor non-perfect squares', () => {
    expect(calculateQuadraticPower(1n)).toBe(1n)
    expect(calculateQuadraticPower(2n)).toBe(1n)
    expect(calculateQuadraticPower(99n)).toBe(9n)
    expect(calculateQuadraticPower(101n)).toBe(10n)
  })
})

describe('calculateVoteCost', () => {
  test('should return votes squared and scale quadratically', () => {
    expect(calculateVoteCost(0n)).toBe(0n)
    expect(calculateVoteCost(1n)).toBe(1n)
    expect(calculateVoteCost(10n)).toBe(100n)
    expect(calculateVoteCost(100n)).toBe(10000n)

    // Doubling votes should more than double cost
    const costFor5 = calculateVoteCost(5n)
    const costFor10 = calculateVoteCost(10n)
    expect(costFor10).toBeGreaterThan(costFor5 * 2n)
  })
})

describe('calculateVotesFromTokens and calculateTokensNeeded roundtrip', () => {
  test('should roundtrip for perfect squares', () => {
    const tokens = 10000n
    const votes = calculateVotesFromTokens(tokens)
    const tokensBack = calculateTokensNeeded(votes)

    expect(votes).toBe(100n)
    expect(tokensBack).toBe(tokens)
  })

  test('should floor votes for non-perfect square tokens', () => {
    const tokens = 50n
    const votes = calculateVotesFromTokens(tokens)
    const tokensNeeded = calculateTokensNeeded(votes)

    expect(votes).toBe(7n)
    expect(tokensNeeded).toBe(49n)
    expect(tokensNeeded).toBeLessThanOrEqual(tokens)
  })

  test('should roundtrip consistently for large perfect square', () => {
    const votes = 1000000n
    const tokens = calculateTokensNeeded(votes)
    const votesBack = calculateVotesFromTokens(tokens)

    expect(votesBack).toBe(votes)
  })
})

describe('simulateQuadraticDistribution', () => {
  test('should return correct voter indices, balances, and quadratic votes', () => {
    const balances = [100n, 400n, 900n]
    const result = simulateQuadraticDistribution(balances)

    expect(result).toHaveLength(3)
    expect(result[0].voter).toBe(0)
    expect(result[0].balance).toBe(100n)
    expect(result[0].votes).toBe(10n)
    expect(result[1].votes).toBe(20n)
    expect(result[2].votes).toBe(30n)
  })

  test('should have percentages that sum to approximately 100', () => {
    const balances = [100n, 400n, 900n, 1600n, 2500n]
    const result = simulateQuadraticDistribution(balances)

    const totalPercentage = result.reduce((sum, r) => sum + r.percentage, 0)
    expect(totalPercentage).toBeGreaterThan(99)
    expect(totalPercentage).toBeLessThanOrEqual(100)
  })

  test('should handle empty and all-zero balances', () => {
    expect(simulateQuadraticDistribution([])).toHaveLength(0)

    const zeroResult = simulateQuadraticDistribution([0n, 0n, 0n])
    for (const r of zeroResult) {
      expect(r.votes).toBe(0n)
      expect(r.percentage).toBe(0)
    }
  })
})

describe('compareVotingMechanisms', () => {
  test('should show quadratic reduces top10 concentration vs linear', () => {
    const balances = [
      1000000n,
      ...Array(20).fill(100n) as bigint[],
    ]

    const result = compareVotingMechanisms(balances)

    expect(result.quadratic.top10Percentage).toBeLessThan(result.linear.top10Percentage)
  })

  test('should return gini coefficients between 0 and 1', () => {
    const balances = [100n, 200n, 300n, 400n, 500n, 1000n, 5000n, 10000n]
    const result = compareVotingMechanisms(balances)

    expect(result.linear.gini).toBeGreaterThanOrEqual(0)
    expect(result.linear.gini).toBeLessThanOrEqual(1)
    expect(result.quadratic.gini).toBeGreaterThanOrEqual(0)
    expect(result.quadratic.gini).toBeLessThanOrEqual(1)
  })

  test('should show lower gini for quadratic than linear with unequal distribution', () => {
    const balances = [
      1000000n, 500000n, 100n, 100n, 100n, 100n, 100n, 100n, 100n, 100n,
      100n, 100n, 100n, 100n, 100n, 100n, 100n, 100n, 100n, 100n,
    ]

    const result = compareVotingMechanisms(balances)

    expect(result.quadratic.gini).toBeLessThan(result.linear.gini)
  })
})

describe('formatQuadraticPower', () => {
  test('should return string with Token Balance, Voting Power, and Effective Rate', () => {
    const result = formatQuadraticPower(1000000000n, 9)
    expect(result).toContain('Token Balance:')
    expect(result).toContain('Voting Power:')
    expect(result).toContain('Effective Rate:')
  })

  test('should use decimals=9 by default', () => {
    const result = formatQuadraticPower(1000000000n)
    expect(result).toContain('Token Balance: 1')
  })
})

describe('validateTokenWeightedVote', () => {
  test('should reject zero voting power', () => {
    const power: VotingPower = {
      own: 0n,
      delegated: 0n,
      total: 0n,
      mechanism: 'token_weighted',
    }

    const result = validateTokenWeightedVote(power)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('No voting power')
  })

  test('should reject power below minimum threshold', () => {
    const power: VotingPower = {
      own: 50n,
      delegated: 0n,
      total: 50n,
      mechanism: 'token_weighted',
    }

    const result = validateTokenWeightedVote(power, 100n)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Minimum')
    expect(result.reason).toContain('100')
  })

  test('should accept valid voting power with no minimum', () => {
    const power: VotingPower = {
      own: 1000n,
      delegated: 0n,
      total: 1000n,
      mechanism: 'token_weighted',
    }

    const result = validateTokenWeightedVote(power)
    expect(result.valid).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  test('should accept power exactly at minimum threshold', () => {
    const power: VotingPower = {
      own: 100n,
      delegated: 0n,
      total: 100n,
      mechanism: 'token_weighted',
    }

    const result = validateTokenWeightedVote(power, 100n)
    expect(result.valid).toBe(true)
  })
})

describe('formatTokenWeightedPower', () => {
  test('should return string containing Own, Delegated, and Total', () => {
    const power: VotingPower = {
      own: 5000000000n,
      delegated: 2000000000n,
      total: 7000000000n,
      mechanism: 'token_weighted',
    }

    const result = formatTokenWeightedPower(power, 9)
    expect(result).toContain('Own:')
    expect(result).toContain('Delegated:')
    expect(result).toContain('Total:')
  })

  test('should use decimals=9 by default', () => {
    const power: VotingPower = {
      own: 1000000000n,
      delegated: 0n,
      total: 1000000000n,
      mechanism: 'token_weighted',
    }

    const result = formatTokenWeightedPower(power)
    expect(result).toContain('Own: 1')
    expect(result).toContain('Total: 1')
  })
})
