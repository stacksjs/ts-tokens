import { describe, test, expect } from 'bun:test'
import {
  checkUnusualAmount,
  checkTokenSecurity,
  checkCollectionSecurity,
} from '../src/security/checks'

describe('checkUnusualAmount', () => {
  test('safe when amount is small relative to supply', () => {
    const result = checkUnusualAmount(100n, 10_000n, 6)
    expect(result.safe).toBe(true)
    expect(result.warnings.length).toBe(0)
  })

  test('warns when amount is more than 50% of supply', () => {
    const result = checkUnusualAmount(6_000n, 10_000n, 6)
    expect(result.safe).toBe(false)
    expect(result.warnings.some(w => w.includes('50%'))).toBe(true)
  })

  test('warns when UI amount exceeds 1 billion', () => {
    // With 0 decimals, amount is the UI amount
    const bigAmount = BigInt(2_000_000_000)
    const result = checkUnusualAmount(bigAmount, bigAmount * 10n, 0)
    expect(result.warnings.some(w => w.includes('very large'))).toBe(true)
  })

  test('safe when amount is exactly 50% of supply', () => {
    const result = checkUnusualAmount(5_000n, 10_000n, 6)
    expect(result.safe).toBe(true) // <= 50%, not >50%
  })

  test('handles zero supply gracefully', () => {
    const result = checkUnusualAmount(100n, 0n, 6)
    // totalSupply is 0, so the >50% check is skipped
    expect(result.safe).toBe(true)
  })

  test('returns recommendations when warnings exist', () => {
    const result = checkUnusualAmount(8_000n, 10_000n, 6)
    expect(result.recommendations.length).toBeGreaterThan(0)
  })
})

describe('checkTokenSecurity', () => {
  test('safe with no authorities and immutable', () => {
    const result = checkTokenSecurity({
      mintAuthority: null,
      freezeAuthority: null,
      supply: 1_000_000n,
      decimals: 6,
      isMutable: false,
    })
    expect(result.safe).toBe(true)
    expect(result.warnings.length).toBe(0)
  })

  test('recommends revoking mint authority when set', () => {
    const result = checkTokenSecurity({
      mintAuthority: 'SomeAddress',
      freezeAuthority: null,
      supply: 1_000_000n,
      decimals: 6,
      isMutable: false,
    })
    expect(result.recommendations.some(r => r.includes('mint authority'))).toBe(true)
  })

  test('warns about freeze authority', () => {
    const result = checkTokenSecurity({
      mintAuthority: null,
      freezeAuthority: 'SomeAddress',
      supply: 1_000_000n,
      decimals: 6,
      isMutable: false,
    })
    expect(result.warnings.some(w => w.includes('Freeze authority'))).toBe(true)
  })

  test('warns about mutable metadata', () => {
    const result = checkTokenSecurity({
      mintAuthority: null,
      freezeAuthority: null,
      supply: 1_000_000n,
      decimals: 6,
      isMutable: true,
    })
    expect(result.warnings.some(w => w.includes('mutable'))).toBe(true)
  })

  test('always returns safe: true regardless of warnings', () => {
    const result = checkTokenSecurity({
      mintAuthority: 'A',
      freezeAuthority: 'B',
      supply: 1_000_000n,
      decimals: 6,
      isMutable: true,
    })
    expect(result.safe).toBe(true) // always safe per implementation
  })
})

describe('checkCollectionSecurity', () => {
  test('safe with low royalty, verified, immutable, correct shares', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'SomeAuthority',
      royaltyBps: 500,
      creatorShares: [100],
      isMutable: false,
      isVerified: true,
    })
    expect(result.safe).toBe(true)
    expect(result.warnings.length).toBe(0)
  })

  test('warns about high royalty (>10%)', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'A',
      royaltyBps: 1500,
      creatorShares: [100],
      isMutable: false,
      isVerified: true,
    })
    expect(result.warnings.some(w => w.includes('High royalty'))).toBe(true)
  })

  test('warns and unsafe when shares do not sum to 100', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'A',
      royaltyBps: 500,
      creatorShares: [50, 30],
      isMutable: false,
      isVerified: true,
    })
    expect(result.safe).toBe(false)
    expect(result.warnings.some(w => w.includes("don't sum"))).toBe(true)
  })

  test('warns about mutable collection', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'A',
      royaltyBps: 500,
      creatorShares: [100],
      isMutable: true,
      isVerified: true,
    })
    expect(result.warnings.some(w => w.includes('mutable'))).toBe(true)
  })

  test('warns about unverified collection', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'A',
      royaltyBps: 500,
      creatorShares: [100],
      isMutable: false,
      isVerified: false,
    })
    expect(result.warnings.some(w => w.includes('not verified'))).toBe(true)
  })

  test('includes recommendations for warnings', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'A',
      royaltyBps: 500,
      creatorShares: [100],
      isMutable: true,
      isVerified: false,
    })
    expect(result.recommendations.length).toBeGreaterThan(0)
  })
})
