/**
 * Jupiter Limit Order & DCA Tests
 */

import { describe, test, expect, afterEach } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import { calculateTakingAmount, formatLimitOrder } from '../src/defi/jupiter-limit'
import type { LimitOrder } from '../src/defi/jupiter-limit'
import { calculateDCADetails, formatDCAPosition } from '../src/defi/jupiter-dca'
import type { CreateDCAOptions, DCAPosition } from '../src/defi/jupiter-dca'

// ---------------------------------------------------------------------------
// Limit Order Helpers
// ---------------------------------------------------------------------------

describe('calculateTakingAmount', () => {
  test('calculates correct amount at price 1.0', () => {
    const result = calculateTakingAmount(1_000_000_000n, 1.0, 9, 9)
    expect(result).toBe(1_000_000_000n)
  })

  test('calculates correct amount at price 2.0', () => {
    const result = calculateTakingAmount(1_000_000_000n, 2.0, 9, 9)
    expect(result).toBe(2_000_000_000n)
  })

  test('calculates correct amount with different decimals', () => {
    const result = calculateTakingAmount(1_000_000n, 0.5, 6, 9)
    expect(result).toBe(500_000_000n)
  })

  test('returns 0 for zero price', () => {
    const result = calculateTakingAmount(1_000_000_000n, 0, 9, 9)
    expect(result).toBe(0n)
  })
})

describe('formatLimitOrder', () => {
  test('formats order correctly', () => {
    const order: LimitOrder = {
      publicKey: 'order123',
      account: {
        maker: 'maker123',
        inputMint: 'mint1',
        outputMint: 'mint2',
        oriMakingAmount: '1000000000',
        oriTakingAmount: '2000000000',
        makingAmount: '500000000',
        takingAmount: '1000000000',
        borrowMakingAmount: '0',
        expiredAt: null,
        createdAt: 1700000000,
        updatedAt: 1700000001,
      },
    }

    const formatted = formatLimitOrder(order)
    expect(formatted).toContain('Order: order123')
    expect(formatted).toContain('Input: mint1')
    expect(formatted).toContain('Output: mint2')
    expect(formatted).toContain('50.0%') // 50% filled
    expect(formatted).toContain('No expiry')
  })

  test('shows expiry when set', () => {
    const order: LimitOrder = {
      publicKey: 'order456',
      account: {
        maker: 'maker',
        inputMint: 'mint1',
        outputMint: 'mint2',
        oriMakingAmount: '100',
        oriTakingAmount: '200',
        makingAmount: '100',
        takingAmount: '200',
        borrowMakingAmount: '0',
        expiredAt: 1700000000,
        createdAt: 1700000000,
        updatedAt: 1700000000,
      },
    }

    const formatted = formatLimitOrder(order)
    expect(formatted).toContain('Expires:')
  })
})

// ---------------------------------------------------------------------------
// DCA Helpers
// ---------------------------------------------------------------------------

describe('calculateDCADetails', () => {
  test('calculates correct number of cycles', () => {
    const options: CreateDCAOptions = {
      inputMint: 'mint1',
      outputMint: 'mint2',
      totalInAmount: 1_000_000_000n,
      inAmountPerCycle: 100_000_000n,
      cycleFrequency: 3600,
    }

    const details = calculateDCADetails(options)
    expect(details.totalCycles).toBe(10)
    expect(details.estimatedDuration).toBe(36000) // 10 * 3600
    expect(details.amountPerCycle).toBe(100_000_000n)
  })

  test('handles single cycle', () => {
    const options: CreateDCAOptions = {
      inputMint: 'mint1',
      outputMint: 'mint2',
      totalInAmount: 1_000_000_000n,
      inAmountPerCycle: 1_000_000_000n,
      cycleFrequency: 86400,
    }

    const details = calculateDCADetails(options)
    expect(details.totalCycles).toBe(1)
    expect(details.estimatedDuration).toBe(86400)
  })
})

describe('formatDCAPosition', () => {
  test('formats active position', () => {
    const position: DCAPosition = {
      publicKey: 'dca123',
      user: 'user123',
      inputMint: 'mint1',
      outputMint: 'mint2',
      inDeposited: '1000000000',
      inWithdrawn: '0',
      outWithdrawn: '500000000',
      inUsed: '500000000',
      inAmountPerCycle: '100000000',
      cycleFrequency: 3600,
      nextCycleAt: Math.floor(Date.now() / 1000) + 3600,
      createdAt: Math.floor(Date.now() / 1000) - 86400,
      minOutAmount: '0',
      maxOutAmount: '0',
      keeperInBalanceBeforeBorrow: '0',
      dcaOutBalanceBeforeSwap: '0',
      userClosed: false,
    }

    const formatted = formatDCAPosition(position)
    expect(formatted).toContain('DCA: dca123')
    expect(formatted).toContain('50%') // 50% used
    expect(formatted).toContain('Active')
  })

  test('shows closed status', () => {
    const position: DCAPosition = {
      publicKey: 'dca456',
      user: 'user',
      inputMint: 'a',
      outputMint: 'b',
      inDeposited: '100',
      inWithdrawn: '0',
      outWithdrawn: '0',
      inUsed: '100',
      inAmountPerCycle: '100',
      cycleFrequency: 3600,
      nextCycleAt: 0,
      createdAt: 0,
      minOutAmount: '0',
      maxOutAmount: '0',
      keeperInBalanceBeforeBorrow: '0',
      dcaOutBalanceBeforeSwap: '0',
      userClosed: true,
    }

    const formatted = formatDCAPosition(position)
    expect(formatted).toContain('Closed')
  })
})
