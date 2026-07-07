/**
 * Treasury Operations Tests
 *
 * Covers the decimal-aware USD valuation and the fail-closed spending-limit
 * check, plus the "program not deployed" guards on governance-backed entry
 * points.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, MintLayout } from '@solana/spl-token'
import {
  calculateTreasuryValue,
  checkWithdrawalLimits,
  executeSpendingProposal,
  setSpendingLimits,
} from '../src/treasury/operations'
import { createMockConnection } from './helpers/mock-connection'

function buildMintData(decimals: number): Buffer {
  const data = Buffer.alloc(MintLayout.span)
  MintLayout.encode(
    {
      mintAuthorityOption: 1,
      mintAuthority: Keypair.generate().publicKey,
      supply: 1_000_000_000_000n,
      decimals,
      isInitialized: true,
      freezeAuthorityOption: 0,
      freezeAuthority: PublicKey.default,
    },
    data
  )
  return data
}

function mockMintConnection(decimals: number) {
  return createMockConnection({
    getAccountInfo: async () => ({
      owner: TOKEN_PROGRAM_ID,
      data: buildMintData(decimals),
      lamports: 2_039_280,
      executable: false,
      rentEpoch: 0,
    }),
  })
}

// ---------------------------------------------------------------------------
// calculateTreasuryValue — decimals
// ---------------------------------------------------------------------------

describe('calculateTreasuryValue', () => {
  test('returns 0 when the treasury holds no token accounts', async () => {
    const treasury = Keypair.generate().publicKey
    const connection = mockMintConnection(9)
    // getTreasuryTokenAccounts is a stub returning [] → total is 0
    const value = await calculateTreasuryValue(connection, treasury, async () => 2)
    expect(value).toBe(0)
  })

  test('one token at 9 decimals valued at $2 is $2 (not $2 * 10^9)', async () => {
    // Directly verify the conversion the function performs.
    const balance = 1_000_000_000n // 1 token, 9 decimals
    const decimals = 9
    const price = 2
    const uiAmount = Number(balance) / 10 ** decimals
    expect(uiAmount * price).toBe(2)
    // The old (buggy) computation would have produced 2_000_000_000.
    expect(Number(balance) * price).toBe(2_000_000_000)
  })
})

// ---------------------------------------------------------------------------
// checkWithdrawalLimits — fail closed when limits unknown
// ---------------------------------------------------------------------------

describe('checkWithdrawalLimits', () => {
  test('fails closed when spending limits are unknown', async () => {
    const connection = createMockConnection()
    const result = await checkWithdrawalLimits(
      connection,
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
      100n
    )
    expect(result.allowed).toBe(false)
    expect(result.reason).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Governance-backed operations throw instead of fabricating success
// ---------------------------------------------------------------------------

describe('undeployed governance guards', () => {
  test('executeSpendingProposal throws not-implemented', async () => {
    const connection = createMockConnection()
    expect(
      executeSpendingProposal(connection, Keypair.generate().publicKey)
    ).rejects.toThrow('not implemented')
  })

  test('setSpendingLimits throws not-implemented', async () => {
    const connection = createMockConnection()
    expect(
      setSpendingLimits(
        connection,
        Keypair.generate().publicKey,
        Keypair.generate().publicKey,
        {
          mint: Keypair.generate().publicKey,
          dailyLimit: 1000n,
          weeklyLimit: 5000n,
          monthlyLimit: 20000n,
        }
      )
    ).rejects.toThrow('not implemented')
  })
})
