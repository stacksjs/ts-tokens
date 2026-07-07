import { describe, test, expect } from 'bun:test'
import { formatUnits, formatFixed } from '../../src/utils/format'

describe('formatUnits', () => {
  test('formats whole and fractional parts', () => {
    expect(formatUnits(1_500_000_000n, 9)).toBe('1.5')
    expect(formatUnits(5_000_000_000n, 9)).toBe('5')
    expect(formatUnits(0n, 9)).toBe('0')
  })

  test('is exact for amounts above 2^53', () => {
    // 2^53 + 1 base units with 0 decimals must not round.
    const big = 9_007_199_254_740_993n // 2^53 + 1
    expect(formatUnits(big, 0)).toBe('9007199254740993')
    // The naive Number-based conversion rounds this away from the true value.
    expect(String(Number(big))).toBe('9007199254740992')
    expect(formatUnits(big, 0)).not.toBe(String(Number(big)))
  })

  test('pads fractional part and trims trailing zeros', () => {
    expect(formatUnits(1n, 9)).toBe('0.000000001')
    expect(formatUnits(100n, 3)).toBe('0.1')
  })

  test('handles zero and negative decimals', () => {
    expect(formatUnits(1234n, 0)).toBe('1234')
    expect(formatUnits(-1_500_000_000n, 9)).toBe('-1.5')
  })

  test('respects displayDecimals cap', () => {
    expect(formatUnits(1_234_567_890n, 9, 2)).toBe('1.23')
  })
})

describe('formatFixed', () => {
  test('produces fixed-decimal output', () => {
    expect(formatFixed(1_500_000_000n, 9, 4)).toBe('1.5000')
    expect(formatFixed(5_000_000_000n, 9, 4)).toBe('5.0000')
    expect(formatFixed(0n, 9, 4)).toBe('0.0000')
  })

  test('rounds half-up when truncating', () => {
    // 1.23456789 SOL, display 2 -> rounds to 1.23
    expect(formatFixed(1_234_567_890n, 9, 2)).toBe('1.23')
    // 0.005 with display 2 rounds up to 0.01
    expect(formatFixed(5_000_000n, 9, 2)).toBe('0.01')
  })

  test('is exact for large lamport amounts', () => {
    // 10,000,000 SOL in lamports = 1e16, above 2^53.
    const lamports = 10_000_000n * 1_000_000_000n
    expect(formatFixed(lamports, 9, 4)).toBe('10000000.0000')
  })

  test('supports zero display decimals', () => {
    expect(formatFixed(3_700_000_000n, 9, 0)).toBe('4')
  })
})
