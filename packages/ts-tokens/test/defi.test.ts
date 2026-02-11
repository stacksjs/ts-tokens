/**
 * DeFi Integration Tests
 *
 * Tests for Raydium pool helpers and Jupiter swap helpers.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import {
  calculatePoolPrice,
  calculateLPValue,
  calculateSwapOutput,
  calculateSwapInput,
  calculatePriceImpact,
  calculateOptimalLPAmounts,
  calculateLPTokens,
  calculateRemoveLiquidity,
  formatPoolInfo,
} from '../src/defi/raydium'
import { calculateMinOutput, formatSwapQuote } from '../src/defi/jupiter'
import type { LiquidityPool, SwapQuote } from '../src/defi/types'

function makePool(overrides: Partial<LiquidityPool> = {}): LiquidityPool {
  return {
    address: Keypair.generate().publicKey,
    protocol: 'raydium',
    tokenA: Keypair.generate().publicKey,
    tokenB: Keypair.generate().publicKey,
    reserveA: 100000n,
    reserveB: 200000n,
    lpMint: Keypair.generate().publicKey,
    lpSupply: 10000n,
    fee: 0.0025,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Raydium pool price
// ---------------------------------------------------------------------------

describe('calculatePoolPrice', () => {
  test('returns reserveB / reserveA for a normal pool', () => {
    const pool = makePool({ reserveA: 100000n, reserveB: 200000n })
    expect(calculatePoolPrice(pool)).toBe(2)
  })

  test('returns 0 when reserveA is 0', () => {
    const pool = makePool({ reserveA: 0n, reserveB: 500n })
    expect(calculatePoolPrice(pool)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// LP value
// ---------------------------------------------------------------------------

describe('calculateLPValue', () => {
  test('returns 0 when lpSupply is 0', () => {
    const pool = makePool({ lpSupply: 0n })
    expect(calculateLPValue(pool, 100n, 1, 2)).toBe(0)
  })

  test('calculates value for full supply ownership', () => {
    const pool = makePool({
      reserveA: 100000n,
      reserveB: 200000n,
      lpSupply: 10000n,
    })
    // owning 100% of supply: shareA = 100000, shareB = 200000
    const value = calculateLPValue(pool, 10000n, 1, 2)
    expect(value).toBe(100000 * 1 + 200000 * 2)
  })

  test('calculates value for partial ownership', () => {
    const pool = makePool({
      reserveA: 100000n,
      reserveB: 200000n,
      lpSupply: 10000n,
    })
    // 10% of supply
    const value = calculateLPValue(pool, 1000n, 1, 2)
    expect(value).toBe(10000 * 1 + 20000 * 2)
  })
})

// ---------------------------------------------------------------------------
// Swap output (AMM constant-product with fee)
// ---------------------------------------------------------------------------

describe('calculateSwapOutput', () => {
  test('produces output less than output reserve', () => {
    const output = calculateSwapOutput(1000n, 100000n, 200000n)
    expect(output).toBeGreaterThan(0n)
    expect(output).toBeLessThan(200000n)
  })

  test('uses the default 25 bps fee', () => {
    const withDefault = calculateSwapOutput(1000n, 100000n, 200000n)
    const withExplicit = calculateSwapOutput(1000n, 100000n, 200000n, 25)
    expect(withDefault).toBe(withExplicit)
  })

  test('higher fee yields less output', () => {
    const lowFee = calculateSwapOutput(1000n, 100000n, 200000n, 10)
    const highFee = calculateSwapOutput(1000n, 100000n, 200000n, 100)
    expect(lowFee).toBeGreaterThan(highFee)
  })

  test('zero input yields zero output', () => {
    const output = calculateSwapOutput(0n, 100000n, 200000n)
    expect(output).toBe(0n)
  })
})

// ---------------------------------------------------------------------------
// Swap input (reverse AMM)
// ---------------------------------------------------------------------------

describe('calculateSwapInput', () => {
  test('roundtrips with calculateSwapOutput within 1 unit', () => {
    const desiredOutput = 1900n
    const inputNeeded = calculateSwapInput(desiredOutput, 100000n, 200000n, 25)
    const actualOutput = calculateSwapOutput(inputNeeded, 100000n, 200000n, 25)
    // The +1n in calculateSwapInput means actual output >= desired
    expect(actualOutput).toBeGreaterThanOrEqual(desiredOutput)
  })

  test('uses default 25 bps fee', () => {
    const withDefault = calculateSwapInput(1000n, 100000n, 200000n)
    const withExplicit = calculateSwapInput(1000n, 100000n, 200000n, 25)
    expect(withDefault).toBe(withExplicit)
  })
})

// ---------------------------------------------------------------------------
// Price impact
// ---------------------------------------------------------------------------

describe('calculatePriceImpact', () => {
  test('returns near-zero impact for small trade', () => {
    const output = calculateSwapOutput(100n, 1_000_000_000n, 2_000_000_000n)
    const impact = calculatePriceImpact(100n, output, 1_000_000_000n, 2_000_000_000n)
    expect(impact).toBeLessThan(0.01)
  })

  test('returns higher impact for larger trade', () => {
    const smallOutput = calculateSwapOutput(100n, 100000n, 200000n)
    const largeOutput = calculateSwapOutput(50000n, 100000n, 200000n)

    const smallImpact = calculatePriceImpact(100n, smallOutput, 100000n, 200000n)
    const largeImpact = calculatePriceImpact(50000n, largeOutput, 100000n, 200000n)

    expect(largeImpact).toBeGreaterThan(smallImpact)
  })
})

// ---------------------------------------------------------------------------
// Optimal LP amounts
// ---------------------------------------------------------------------------

describe('calculateOptimalLPAmounts', () => {
  test('returns proportional amountB for a normal pool', () => {
    const pool = makePool({ reserveA: 100000n, reserveB: 200000n })
    const result = calculateOptimalLPAmounts(pool, 1000n)
    expect(result.amountA).toBe(1000n)
    expect(result.amountB).toBe(2000n)
  })

  test('returns equal amounts when reserves are zero', () => {
    const pool = makePool({ reserveA: 0n, reserveB: 0n })
    const result = calculateOptimalLPAmounts(pool, 5000n)
    expect(result.amountA).toBe(5000n)
    expect(result.amountB).toBe(5000n)
  })
})

// ---------------------------------------------------------------------------
// LP token minting
// ---------------------------------------------------------------------------

describe('calculateLPTokens', () => {
  test('uses sqrt for initial liquidity when lpSupply is 0', () => {
    const pool = makePool({ lpSupply: 0n })
    const lp = calculateLPTokens(pool, 1000n, 4000n)
    // sqrt(1000 * 4000) = sqrt(4000000) = 2000
    expect(lp).toBe(2000n)
  })

  test('returns minimum of proportional amounts for existing pool', () => {
    const pool = makePool({
      reserveA: 100000n,
      reserveB: 200000n,
      lpSupply: 10000n,
    })
    // lpFromA = 1000 * 10000 / 100000 = 100
    // lpFromB = 2000 * 10000 / 200000 = 100
    const lp = calculateLPTokens(pool, 1000n, 2000n)
    expect(lp).toBe(100n)
  })
})

// ---------------------------------------------------------------------------
// Remove liquidity
// ---------------------------------------------------------------------------

describe('calculateRemoveLiquidity', () => {
  test('returns proportional amounts', () => {
    const pool = makePool({
      reserveA: 100000n,
      reserveB: 200000n,
      lpSupply: 10000n,
    })
    const { amountA, amountB } = calculateRemoveLiquidity(pool, 1000n)
    expect(amountA).toBe(10000n)
    expect(amountB).toBe(20000n)
  })

  test('returns zeros when lpSupply is 0', () => {
    const pool = makePool({ lpSupply: 0n })
    const { amountA, amountB } = calculateRemoveLiquidity(pool, 1000n)
    expect(amountA).toBe(0n)
    expect(amountB).toBe(0n)
  })
})

// ---------------------------------------------------------------------------
// Format pool info
// ---------------------------------------------------------------------------

describe('formatPoolInfo', () => {
  test('includes all required fields', () => {
    const pool = makePool({ fee: 0.0025, apy: 12.5 })
    const info = formatPoolInfo(pool)

    expect(info).toContain(`Pool: ${pool.address.toBase58()}`)
    expect(info).toContain('Protocol: raydium')
    expect(info).toContain(`Token A: ${pool.tokenA.toBase58()}`)
    expect(info).toContain(`Token B: ${pool.tokenB.toBase58()}`)
    expect(info).toContain('Price: 2.000000')
    expect(info).toContain('Fee: 0.25%')
    expect(info).toContain('APY: 12.50%')
  })

  test('omits APY line when apy is undefined', () => {
    const pool = makePool({ apy: undefined })
    const info = formatPoolInfo(pool)
    expect(info).not.toContain('APY:')
  })
})

// ---------------------------------------------------------------------------
// Jupiter — calculateMinOutput
// ---------------------------------------------------------------------------

describe('calculateMinOutput', () => {
  test('subtracts slippage from output', () => {
    // 50 bps = 0.5%
    const min = calculateMinOutput(10000n, 50)
    expect(min).toBe(9950n)
  })

  test('returns full amount when slippage is 0', () => {
    expect(calculateMinOutput(10000n, 0)).toBe(10000n)
  })
})

// ---------------------------------------------------------------------------
// Jupiter — formatSwapQuote
// ---------------------------------------------------------------------------

describe('formatSwapQuote', () => {
  test('formats a single-hop quote correctly', () => {
    const inputMint = Keypair.generate().publicKey
    const outputMint = Keypair.generate().publicKey

    const quote: SwapQuote = {
      inputMint,
      outputMint,
      inputAmount: 1_000_000n, // 1 token with 6 decimals
      outputAmount: 2_000_000n,
      priceImpact: 0.005,
      fee: 100n,
      route: [
        {
          protocol: 'Raydium',
          inputMint,
          outputMint,
          inputAmount: 1_000_000n,
          outputAmount: 2_000_000n,
          poolAddress: Keypair.generate().publicKey,
        },
      ],
      expiresAt: Date.now() + 30000,
    }

    const formatted = formatSwapQuote(quote, 6, 6)

    expect(formatted).toContain('Input: 1.000000')
    expect(formatted).toContain('Output: 2.000000')
    expect(formatted).toContain('Rate: 1 = 2.000000')
    expect(formatted).toContain('Price Impact: 0.50%')
    expect(formatted).toContain('Route: Raydium')
  })

  test('formats multi-hop route with arrow separator', () => {
    const mintA = Keypair.generate().publicKey
    const mintB = Keypair.generate().publicKey
    const mintC = Keypair.generate().publicKey

    const quote: SwapQuote = {
      inputMint: mintA,
      outputMint: mintC,
      inputAmount: 1_000_000_000n, // 1 token with 9 decimals
      outputAmount: 500_000_000n,
      priceImpact: 0.01,
      fee: 200n,
      route: [
        {
          protocol: 'Raydium',
          inputMint: mintA,
          outputMint: mintB,
          inputAmount: 1_000_000_000n,
          outputAmount: 750_000_000n,
          poolAddress: Keypair.generate().publicKey,
        },
        {
          protocol: 'Orca',
          inputMint: mintB,
          outputMint: mintC,
          inputAmount: 750_000_000n,
          outputAmount: 500_000_000n,
          poolAddress: Keypair.generate().publicKey,
        },
      ],
      expiresAt: Date.now() + 30000,
    }

    const formatted = formatSwapQuote(quote, 9, 9)
    expect(formatted).toContain('Route: Raydium \u2192 Orca')
  })
})
