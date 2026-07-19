/**
 * Voting Mechanism Tests
 *
 * Tests for quadratic voting and token-weighted voting pure functions.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
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
  createSnapshot,
} from '../src/voting/token-weighted'
import {
  calculateNFTVotingPower,
  createRarityWeights,
  simulateTraitWeightedVoting,
} from '../src/voting/nft-voting'
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

  test('should default to decimals=0 (raw units treated as whole tokens)', () => {
    expect(calculateQuadraticPower(10000n)).toBe(100n)
  })

  test('should convert base units to whole tokens using decimals', () => {
    // 100 tokens at 9 decimals = 100 * 10^9 base units → √100 = 10 votes,
    // NOT √(100e9) which would be ~316,227.
    const baseUnits = 100n * 10n ** 9n
    expect(calculateQuadraticPower(baseUnits, 9)).toBe(10n)

    // 10,000 tokens at 6 decimals → √10000 = 100 votes.
    expect(calculateQuadraticPower(10000n * 10n ** 6n, 6)).toBe(100n)
  })

  test('should align with calculateVoteCost after decimals scaling', () => {
    // A voter with 25 whole tokens (6 decimals) should get 5 votes, and 5 votes
    // should cost 25 tokens.
    const decimals = 6
    const tokens = 25n
    const baseUnits = tokens * 10n ** BigInt(decimals)
    const votes = calculateQuadraticPower(baseUnits, decimals)
    expect(votes).toBe(5n)
    expect(calculateVoteCost(votes)).toBe(tokens)
  })

  test('should return 0 when balance is below one whole token', () => {
    // 0.5 tokens at 9 decimals rounds down to 0 whole tokens.
    expect(calculateQuadraticPower(5n * 10n ** 8n, 9)).toBe(0n)
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

  test('should not produce NaN% for a zero balance', () => {
    const result = formatQuadraticPower(0n, 9)
    expect(result).not.toContain('NaN')
    expect(result).toContain('Effective Rate: 0.00%')
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

// ---------------------------------------------------------------------------
// createSnapshot — owner aggregation
// ---------------------------------------------------------------------------

/**
 * Build a 165-byte SPL token account buffer with the given mint, owner, and
 * amount at their canonical offsets (0, 32, 64).
 */
function makeTokenAccountData(mint: PublicKey, owner: PublicKey, amount: bigint): Buffer {
  const data = Buffer.alloc(165)
  mint.toBuffer().copy(data, 0)
  owner.toBuffer().copy(data, 32)
  data.writeBigUInt64LE(amount, 64)
  return data
}

describe('createSnapshot', () => {
  test('aggregates balances by owner wallet and keys the map by wallet', async () => {
    const mint = Keypair.generate().publicKey
    const walletA = Keypair.generate().publicKey
    const walletB = Keypair.generate().publicKey

    // walletA holds two token accounts; walletB holds one.
    const programAccounts = [
      { account: { data: makeTokenAccountData(mint, walletA, 100n) } },
      { account: { data: makeTokenAccountData(mint, walletA, 50n) } },
      { account: { data: makeTokenAccountData(mint, walletB, 25n) } },
    ]

    const connection = {
      getSlot: async () => 123,
      getProgramAccounts: async () => programAccounts,
      getTokenSupply: async () => ({ value: { amount: '175' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    const snapshot = await createSnapshot(connection, Keypair.generate().publicKey, mint)

    // Keyed by wallet, not token-account address, and balances summed.
    expect(snapshot.holders.get(walletA.toBase58())).toBe(150n)
    expect(snapshot.holders.get(walletB.toBase58())).toBe(25n)
    expect(snapshot.totalSupply).toBe(175n)
  })
})

// ---------------------------------------------------------------------------
// NFT trait-weighted voting
// ---------------------------------------------------------------------------

describe('calculateNFTVotingPower (trait-weighted)', () => {
  test('a Common NFT yields ~1 vote (not ~100x inflated)', () => {
    const weights = createRarityWeights()
    const nfts = [{ traits: new Map([['Rarity', 'Common']]) }]
    const result = simulateTraitWeightedVoting(nfts, weights)
    // Base 1 + Common weight 1 = 2 votes on the whole-vote scale.
    expect(result[0].weight).toBe(2n)
  })

  test('rarer NFTs scale up but stay on a sane whole-vote scale', () => {
    const weights = createRarityWeights()
    const nfts = [
      { traits: new Map([['Rarity', 'Common']]) },
      { traits: new Map([['Rarity', 'Legendary']]) },
    ]
    const result = simulateTraitWeightedVoting(nfts, weights)
    // Common: base 1 + 1 = 2. Legendary: base 1 + 25 = 26.
    expect(result[0].weight).toBe(2n)
    expect(result[1].weight).toBe(26n)
    // Not the pre-fix inflated values (would have been ~101 and ~2501).
    expect(result[1].weight).toBeLessThan(100n)
  })

  test('supports fractional trait weights via the fixed-point scale', () => {
    const weights = new Map([
      ['Boost', new Map([['Half', 0.5]])],
    ])
    const nfts = [{ traits: new Map([['Boost', 'Half']]) }]
    const result = simulateTraitWeightedVoting(nfts, weights)
    // Base 100 + 50 = 150 scaled → 1 whole vote after integer division.
    expect(result[0].weight).toBe(1n)
  })

  test('throws when oneNftOneVote is false and traitWeights is missing', async () => {
    const collection = Keypair.generate().publicKey
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = {} as any

    await expect(
      calculateNFTVotingPower(connection, Keypair.generate().publicKey, {
        collection,
        oneNftOneVote: false,
      })
    ).rejects.toThrow(/traitWeights/i)
  })
})

// ---------------------------------------------------------------------------
// Honest failures — no fabricated zero data
// ---------------------------------------------------------------------------

describe('honest failures instead of silent zero data', () => {
  test('calculateNFTVotingPower throws (NFT enumeration needs DAS / indexing)', async () => {
    const collection = Keypair.generate().publicKey
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = {} as any

    await expect(
      calculateNFTVotingPower(connection, Keypair.generate().publicKey, {
        collection,
        oneNftOneVote: true,
      })
    ).rejects.toThrow(/not implemented/i)
  })

  test('getCollectionVotingStats throws instead of returning zeros', async () => {
    const { getCollectionVotingStats } = await import('../src/voting/nft-voting')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = {} as any

    await expect(
      getCollectionVotingStats(connection, Keypair.generate().publicKey)
    ).rejects.toThrow(/not implemented/i)
  })

  test('validateNFTVote propagates the not-implemented failure', async () => {
    const { validateNFTVote } = await import('../src/voting/nft-voting')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = {} as any

    await expect(
      validateNFTVote(connection, Keypair.generate().publicKey, {
        collection: Keypair.generate().publicKey,
        oneNftOneVote: true,
      })
    ).rejects.toThrow(/not implemented/i)
  })

  test('checkDoubleVoting throws instead of reporting "not voted"', async () => {
    const { checkDoubleVoting } = await import('../src/voting/token-weighted')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = {} as any
    const snapshot = {
      proposal: Keypair.generate().publicKey,
      slot: 1,
      timestamp: Date.now(),
      totalSupply: 100n,
      holders: new Map<string, bigint>(),
    }

    await expect(
      checkDoubleVoting(connection, Keypair.generate().publicKey, Keypair.generate().publicKey, snapshot)
    ).rejects.toThrow(/not implemented/i)
  })
})
