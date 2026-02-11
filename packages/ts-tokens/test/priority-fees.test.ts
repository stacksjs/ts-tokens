/**
 * Priority Fee Tests
 *
 * Tests for priority fee estimation and helpers.
 */

import { describe, test, expect, afterEach } from 'bun:test'
import { createPriorityFeeInstructions } from '../src/transaction/priority-fees'
import { ComputeBudgetProgram } from '@solana/web3.js'

// ---------------------------------------------------------------------------
// createPriorityFeeInstructions
// ---------------------------------------------------------------------------

describe('createPriorityFeeInstructions', () => {
  test('returns empty array for 0 microLamports', () => {
    const instructions = createPriorityFeeInstructions(0)
    expect(instructions).toHaveLength(0)
  })

  test('returns single instruction for positive microLamports', () => {
    const instructions = createPriorityFeeInstructions(10000)
    expect(instructions).toHaveLength(1)
    // Should be ComputeBudgetProgram.setComputeUnitPrice
    expect(instructions[0].programId.toBase58()).toBe(ComputeBudgetProgram.programId.toBase58())
  })

  test('returns two instructions when computeUnits is also specified', () => {
    const instructions = createPriorityFeeInstructions(10000, 200000)
    expect(instructions).toHaveLength(2)
    // Both should be ComputeBudgetProgram
    expect(instructions[0].programId.toBase58()).toBe(ComputeBudgetProgram.programId.toBase58())
    expect(instructions[1].programId.toBase58()).toBe(ComputeBudgetProgram.programId.toBase58())
  })

  test('only includes compute unit limit when microLamports is 0', () => {
    const instructions = createPriorityFeeInstructions(0, 200000)
    expect(instructions).toHaveLength(1) // Only compute unit limit
  })
})

// ---------------------------------------------------------------------------
// getPriorityFeeEstimateHelius (mocked)
// ---------------------------------------------------------------------------

describe('getPriorityFeeEstimateHelius', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('returns parsed Helius fee levels', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({
        result: {
          priorityFeeLevels: {
            min: 0,
            low: 1000,
            medium: 50000,
            high: 200000,
            veryHigh: 1000000,
          },
        },
      }),
    })) as any

    const { getPriorityFeeEstimateHelius } = await import('../src/transaction/priority-fees')
    const estimate = await getPriorityFeeEstimateHelius('https://mainnet.helius-rpc.com/?api-key=test')

    expect(estimate.min).toBe(0)
    expect(estimate.low).toBe(1000)
    expect(estimate.medium).toBe(50000)
    expect(estimate.high).toBe(200000)
    expect(estimate.veryHigh).toBe(1000000)
  })

  test('returns default fees on error', async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      statusText: 'Internal Server Error',
    })) as any

    const { getPriorityFeeEstimateHelius } = await import('../src/transaction/priority-fees')
    const estimate = await getPriorityFeeEstimateHelius('https://bad-url.com')

    expect(estimate.min).toBe(0)
    expect(estimate.low).toBe(1000)
    expect(estimate.medium).toBe(10000)
    expect(estimate.high).toBe(100000)
    expect(estimate.veryHigh).toBe(1000000)
  })
})
