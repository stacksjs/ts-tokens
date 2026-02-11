/**
 * Vesting Schedule Tests
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import { calculateVestedAmount } from '../src/vesting/schedule'
import type { VestingSchedule, VestingStatusReport } from '../src/vesting/types'

/**
 * Create a test vesting schedule
 */
function makeSchedule(overrides: Partial<VestingSchedule> = {}): VestingSchedule {
  const now = Date.now()
  const monthMs = 30 * 24 * 60 * 60 * 1000

  return {
    id: 'vesting-test',
    recipient: Keypair.generate().publicKey.toBase58(),
    mint: Keypair.generate().publicKey.toBase58(),
    totalAmount: 1_000_000_000n,
    vestedAmount: 0n,
    claimedAmount: 0n,
    cliffMonths: 6,
    vestingMonths: 24,
    cliffPercentage: 10,
    startDate: now - monthMs * 12, // Started 12 months ago
    cliffDate: now - monthMs * 6, // Cliff 6 months ago
    endDate: now + monthMs * 18, // Ends in 18 months
    status: 'active',
    claimSignatures: [],
    createdAt: now - monthMs * 12,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// calculateVestedAmount
// ---------------------------------------------------------------------------

describe('calculateVestedAmount', () => {
  test('returns 0 before cliff', () => {
    const now = Date.now()
    const monthMs = 30 * 24 * 60 * 60 * 1000

    const schedule = makeSchedule({
      startDate: now,
      cliffDate: now + monthMs * 6,
      endDate: now + monthMs * 30,
    })

    const vested = calculateVestedAmount(schedule, now + monthMs * 3)
    expect(vested).toBe(0n)
  })

  test('returns total at end date', () => {
    const schedule = makeSchedule()
    const vested = calculateVestedAmount(schedule, schedule.endDate + 1000)
    expect(vested).toBe(schedule.totalAmount)
  })

  test('returns total after end date', () => {
    const schedule = makeSchedule()
    const farFuture = schedule.endDate + 365 * 24 * 60 * 60 * 1000
    const vested = calculateVestedAmount(schedule, farFuture)
    expect(vested).toBe(schedule.totalAmount)
  })

  test('returns cliff amount at cliff date', () => {
    const schedule = makeSchedule({
      totalAmount: 1_000_000_000n,
      cliffPercentage: 10,
    })

    const vested = calculateVestedAmount(schedule, schedule.cliffDate)
    // At cliff: 10% = 100_000_000, plus 0 linear (just started)
    expect(vested).toBe(100_000_000n)
  })

  test('handles 0% cliff', () => {
    const schedule = makeSchedule({ cliffPercentage: 0 })
    const vested = calculateVestedAmount(schedule, schedule.cliffDate)
    expect(vested).toBe(0n) // 0% cliff, linear just started
  })

  test('increases linearly between cliff and end', () => {
    const schedule = makeSchedule({
      totalAmount: 1_000_000_000n,
      cliffPercentage: 0,
    })

    const midpoint = schedule.cliffDate + (schedule.endDate - schedule.cliffDate) / 2
    const vested = calculateVestedAmount(schedule, midpoint)

    // Should be approximately 50% of total
    expect(vested).toBeGreaterThan(400_000_000n)
    expect(vested).toBeLessThan(600_000_000n)
  })

  test('vested amount increases over time', () => {
    const schedule = makeSchedule({
      totalAmount: 1_000_000_000n,
      cliffPercentage: 0,
    })

    const vestingDuration = schedule.endDate - schedule.cliffDate
    const vested25 = calculateVestedAmount(schedule, schedule.cliffDate + vestingDuration * 0.25)
    const vested50 = calculateVestedAmount(schedule, schedule.cliffDate + vestingDuration * 0.50)
    const vested75 = calculateVestedAmount(schedule, schedule.cliffDate + vestingDuration * 0.75)

    expect(vested50).toBeGreaterThan(vested25)
    expect(vested75).toBeGreaterThan(vested50)
  })
})

// ---------------------------------------------------------------------------
// Type shapes
// ---------------------------------------------------------------------------

describe('Vesting types', () => {
  test('VestingSchedule has all required fields', () => {
    const schedule = makeSchedule()
    expect(schedule.id).toBeTruthy()
    expect(schedule.recipient).toBeTruthy()
    expect(schedule.mint).toBeTruthy()
    expect(schedule.totalAmount).toBeGreaterThan(0n)
    expect(schedule.cliffMonths).toBeGreaterThanOrEqual(0)
    expect(schedule.vestingMonths).toBeGreaterThan(0)
  })

  test('VestingStatusReport shape', () => {
    const report: VestingStatusReport = {
      id: 'test',
      recipient: 'addr',
      mint: 'mint',
      totalAmount: 1000n,
      vestedAmount: 500n,
      claimedAmount: 250n,
      unvestedAmount: 500n,
      claimableAmount: 250n,
      percentageVested: 50,
      percentageClaimed: 25,
      isCliffReached: true,
      status: 'active',
    }

    expect(report.percentageVested).toBe(50)
    expect(report.percentageClaimed).toBe(25)
  })
})
