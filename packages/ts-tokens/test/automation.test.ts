/**
 * Automation & Scheduling Tests
 *
 * Tests for cron parser, scheduler, batch metadata, ALTs, and mint schedules.
 * All tests are pure/local — no network required.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { Keypair } from '@solana/web3.js'

// Cron
import {
  parseCronExpression,
  parseField,
  getNextRun,
  createCronJob,
  removeCronJob,
  enableCronJob,
  disableCronJob,
  listCronJobs,
} from '../src/automation/cron'

// Scheduler
import {
  scheduleJob,
  cancelJob,
  getJob,
  listJobs,
  loadSchedulerState,
  saveSchedulerState,
  generateId,
  cleanupJobs,
} from '../src/automation/scheduler'

// Mint automation
import {
  setMintSchedule,
  getMintSchedule,
  listMintSchedules,
  removeMintSchedule,
  checkMintEligibility,
} from '../src/automation/mint-automation'

// Batch metadata
import {
  buildMetadataUpdateInstruction,
  validateBatchMetadataItem,
  prepareBatchMetadataUpdate,
} from '../src/batch/metadata'

// Lookup table helpers
import { chunkAddresses } from '../src/batch/lookup-table'

// ============================================
// Test helpers
// ============================================

let tmpDir: string
let storePath: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-test-'))
  storePath = path.join(tmpDir, 'scheduler-state.json')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ============================================
// 1. Cron Parser Tests
// ============================================

describe('parseCronExpression', () => {
  test('should parse "* * * * *" (every minute)', () => {
    const schedule = parseCronExpression('* * * * *')
    expect(schedule.minutes.length).toBe(60)
    expect(schedule.hours.length).toBe(24)
    expect(schedule.daysOfMonth.length).toBe(31)
    expect(schedule.months.length).toBe(12)
    expect(schedule.daysOfWeek.length).toBe(7)
  })

  test('should parse "0 */6 * * *" (every 6 hours)', () => {
    const schedule = parseCronExpression('0 */6 * * *')
    expect(schedule.minutes).toEqual([0])
    expect(schedule.hours).toEqual([0, 6, 12, 18])
  })

  test('should parse "30 2 * * 1-5" (weekdays at 2:30)', () => {
    const schedule = parseCronExpression('30 2 * * 1-5')
    expect(schedule.minutes).toEqual([30])
    expect(schedule.hours).toEqual([2])
    expect(schedule.daysOfWeek).toEqual([1, 2, 3, 4, 5])
  })

  test('should parse "0 0 1 * *" (first of month at midnight)', () => {
    const schedule = parseCronExpression('0 0 1 * *')
    expect(schedule.minutes).toEqual([0])
    expect(schedule.hours).toEqual([0])
    expect(schedule.daysOfMonth).toEqual([1])
  })

  test('should parse ranges "1-5"', () => {
    const values = parseField('1-5', 0, 59)
    expect(values).toEqual([1, 2, 3, 4, 5])
  })

  test('should parse lists "1,3,5"', () => {
    const values = parseField('1,3,5', 0, 59)
    expect(values).toEqual([1, 3, 5])
  })

  test('should parse step "*/10"', () => {
    const values = parseField('*/10', 0, 59)
    expect(values).toEqual([0, 10, 20, 30, 40, 50])
  })

  test('should throw on invalid expression', () => {
    expect(() => parseCronExpression('invalid')).toThrow()
    expect(() => parseCronExpression('* * *')).toThrow()
    expect(() => parseCronExpression('60 * * * *')).toThrow()
  })
})

describe('getNextRun', () => {
  test('should calculate next run correctly for simple schedule', () => {
    const schedule = parseCronExpression('0 12 * * *') // Every day at noon
    const from = new Date('2025-06-15T10:00:00Z')
    const next = getNextRun(schedule, from)

    expect(next.getUTCHours()).toBe(12)
    expect(next.getUTCMinutes()).toBe(0)
    expect(next.getTime()).toBeGreaterThan(from.getTime())
  })

  test('should handle day-of-week constraint', () => {
    const schedule = parseCronExpression('0 9 * * 1') // Every Monday at 9
    const from = new Date('2025-06-15T10:00:00Z') // Sunday
    const next = getNextRun(schedule, from)

    expect(next.getDay()).toBe(1) // Monday
    expect(next.getUTCHours()).toBe(9)
  })

  test('should advance to next matching time', () => {
    const schedule = parseCronExpression('30 * * * *') // Every hour at :30
    const from = new Date('2025-06-15T10:35:00Z')
    const next = getNextRun(schedule, from)

    expect(next.getUTCMinutes()).toBe(30)
    // Should be at 11:30 since we're past 10:30
    expect(next.getUTCHours()).toBe(11)
  })
})

// ============================================
// 2. Scheduler Tests
// ============================================

describe('scheduleJob', () => {
  test('should schedule a job in the future', () => {
    const futureTime = Date.now() + 60000
    const job = scheduleJob({
      name: 'Test Transfer',
      scheduledAt: futureTime,
      action: { type: 'transfer', mint: 'abc', to: 'def', amount: '100' },
    }, storePath)

    expect(job.id).toContain('job-')
    expect(job.name).toBe('Test Transfer')
    expect(job.status).toBe('scheduled')
    expect(job.scheduledAt).toBe(futureTime)
    expect(job.action.type).toBe('transfer')
  })

  test('should reject scheduling in the past', () => {
    expect(() => scheduleJob({
      name: 'Past Job',
      scheduledAt: Date.now() - 1000,
      action: { type: 'transfer', mint: 'abc', to: 'def', amount: '100' },
    }, storePath)).toThrow('scheduledAt must be in the future')
  })
})

describe('cancelJob', () => {
  test('should cancel a pending job', () => {
    const job = scheduleJob({
      name: 'Cancellable',
      scheduledAt: Date.now() + 60000,
      action: { type: 'transfer', mint: 'abc', to: 'def', amount: '100' },
    }, storePath)

    const cancelled = cancelJob(job.id, storePath)
    expect(cancelled).toBe(true)

    const updated = getJob(job.id, storePath)
    expect(updated?.status).toBe('cancelled')
  })

  test('should return false for non-existent job', () => {
    expect(cancelJob('nonexistent', storePath)).toBe(false)
  })
})

describe('listJobs', () => {
  test('should list jobs with status filter', () => {
    scheduleJob({
      name: 'Job 1',
      scheduledAt: Date.now() + 60000,
      action: { type: 'transfer', mint: 'a', to: 'b', amount: '1' },
    }, storePath)

    const job2 = scheduleJob({
      name: 'Job 2',
      scheduledAt: Date.now() + 120000,
      action: { type: 'transfer', mint: 'c', to: 'd', amount: '2' },
    }, storePath)

    cancelJob(job2.id, storePath)

    const scheduled = listJobs({ status: 'scheduled' }, storePath)
    expect(scheduled.length).toBe(1)
    expect(scheduled[0].name).toBe('Job 1')

    const cancelled = listJobs({ status: 'cancelled' }, storePath)
    expect(cancelled.length).toBe(1)
    expect(cancelled[0].name).toBe('Job 2')
  })
})

describe('state persistence', () => {
  test('should save and load state round-trip', () => {
    const job = scheduleJob({
      name: 'Persist Me',
      scheduledAt: Date.now() + 60000,
      action: { type: 'mint', mint: 'abc', to: 'def', amount: '500' },
    }, storePath)

    // Load from fresh state
    const loaded = getJob(job.id, storePath)
    expect(loaded).not.toBeNull()
    expect(loaded!.name).toBe('Persist Me')
    expect(loaded!.action.type).toBe('mint')
  })

  test('should generate unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateId('test'))
    }
    expect(ids.size).toBe(100)
  })
})

describe('cleanupJobs', () => {
  test('should clean up old completed jobs', () => {
    // Manually create an old completed job
    const state = loadSchedulerState(storePath)
    state.jobs['old-job'] = {
      id: 'old-job',
      name: 'Old Job',
      status: 'completed',
      scheduledAt: 1000,
      createdAt: 1000, // Very old
      completedAt: 2000,
      action: { type: 'transfer', mint: 'a', to: 'b', amount: '1' },
    }
    saveSchedulerState(state, storePath)

    const removed = cleanupJobs(1, storePath) // 1ms max age
    expect(removed).toBe(1)

    const loaded = getJob('old-job', storePath)
    expect(loaded).toBeNull()
  })
})

// ============================================
// 3. Batch Metadata Tests
// ============================================

describe('validateBatchMetadataItem', () => {
  test('should reject empty updates', () => {
    const error = validateBatchMetadataItem({
      mint: Keypair.generate().publicKey.toBase58(),
      updates: {},
    })
    expect(error).toContain('No update fields')
  })

  test('should reject invalid mint address', () => {
    const error = validateBatchMetadataItem({
      mint: 'not-a-valid-address',
      updates: { name: 'Test' },
    })
    expect(error).toContain('Invalid mint address')
  })

  test('should accept valid item', () => {
    const error = validateBatchMetadataItem({
      mint: Keypair.generate().publicKey.toBase58(),
      updates: { name: 'Updated Name' },
    })
    expect(error).toBeNull()
  })

  test('should accept item with multiple update fields', () => {
    const error = validateBatchMetadataItem({
      mint: Keypair.generate().publicKey.toBase58(),
      updates: {
        name: 'New Name',
        symbol: 'NEW',
        uri: 'https://example.com/metadata.json',
        sellerFeeBasisPoints: 500,
      },
    })
    expect(error).toBeNull()
  })
})

describe('buildMetadataUpdateInstruction', () => {
  test('should build instruction with correct program ID', () => {
    const mint = Keypair.generate().publicKey
    const authority = Keypair.generate().publicKey

    const ix = buildMetadataUpdateInstruction(
      mint.toBase58(),
      { name: 'Test' },
      authority,
    )

    expect(ix.programId.toBase58()).toBe('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    expect(ix.keys.length).toBe(2)
    expect(ix.keys[1].pubkey.toBase58()).toBe(authority.toBase58())
  })

  test('should include discriminator 15 in data', () => {
    const mint = Keypair.generate().publicKey
    const authority = Keypair.generate().publicKey

    const ix = buildMetadataUpdateInstruction(
      mint.toBase58(),
      { name: 'Test' },
      authority,
    )

    // First byte is the discriminator
    expect(ix.data[0]).toBe(15)
  })
})

describe('prepareBatchMetadataUpdate', () => {
  test('should return correct number of instructions for valid items', () => {
    const authority = Keypair.generate().publicKey
    const items = Array.from({ length: 3 }, () => ({
      mint: Keypair.generate().publicKey.toBase58(),
      updates: { name: 'Updated' },
    }))

    const { instructions, errors } = prepareBatchMetadataUpdate(items, authority)
    expect(instructions.length).toBe(3)
    expect(errors.length).toBe(0)
  })

  test('should separate valid and invalid items', () => {
    const authority = Keypair.generate().publicKey
    const items = [
      { mint: Keypair.generate().publicKey.toBase58(), updates: { name: 'Good' } },
      { mint: 'invalid-address', updates: { name: 'Bad' } },
      { mint: Keypair.generate().publicKey.toBase58(), updates: {} },
    ]

    const { instructions, errors } = prepareBatchMetadataUpdate(items, authority)
    expect(instructions.length).toBe(1) // Only first is valid
    expect(errors.length).toBe(2)
  })
})

// ============================================
// 4. Address Lookup Table Tests
// ============================================

describe('chunkAddresses', () => {
  test('should chunk addresses respecting max size', () => {
    const addresses = Array.from({ length: 75 }, (_, i) => `addr${i}`)
    const chunks = chunkAddresses(addresses, 30)

    expect(chunks.length).toBe(3)
    expect(chunks[0].length).toBe(30)
    expect(chunks[1].length).toBe(30)
    expect(chunks[2].length).toBe(15)
  })

  test('should handle empty array', () => {
    const chunks = chunkAddresses([], 30)
    expect(chunks.length).toBe(0)
  })

  test('should handle array smaller than chunk size', () => {
    const addresses = ['a', 'b', 'c']
    const chunks = chunkAddresses(addresses, 30)
    expect(chunks.length).toBe(1)
    expect(chunks[0]).toEqual(['a', 'b', 'c'])
  })

  test('should handle exact chunk size', () => {
    const addresses = Array.from({ length: 30 }, (_, i) => `addr${i}`)
    const chunks = chunkAddresses(addresses, 30)
    expect(chunks.length).toBe(1)
    expect(chunks[0].length).toBe(30)
  })
})

// ============================================
// 5. Mint Schedule Tests
// ============================================

describe('setMintSchedule / getMintSchedule', () => {
  test('should set and retrieve a mint schedule', () => {
    const mint = Keypair.generate().publicKey.toBase58()
    setMintSchedule({
      mint,
      startTime: Date.now() + 60000,
      endTime: Date.now() + 120000,
      maxSupply: '1000000',
    }, storePath)

    const schedule = getMintSchedule(mint, storePath)
    expect(schedule).not.toBeNull()
    expect(schedule!.mint).toBe(mint)
    expect(schedule!.maxSupply).toBe('1000000')
  })

  test('should list all mint schedules', () => {
    const mint1 = Keypair.generate().publicKey.toBase58()
    const mint2 = Keypair.generate().publicKey.toBase58()

    setMintSchedule({ mint: mint1, startTime: Date.now() + 60000 }, storePath)
    setMintSchedule({ mint: mint2, endTime: Date.now() + 120000 }, storePath)

    const schedules = listMintSchedules(storePath)
    expect(schedules.length).toBe(2)
  })

  test('should remove a mint schedule', () => {
    const mint = Keypair.generate().publicKey.toBase58()
    setMintSchedule({ mint, startTime: Date.now() + 60000 }, storePath)

    const removed = removeMintSchedule(mint, storePath)
    expect(removed).toBe(true)

    const schedule = getMintSchedule(mint, storePath)
    expect(schedule).toBeNull()
  })
})

describe('checkMintEligibility', () => {
  test('should be eligible when within time window', () => {
    const mint = Keypair.generate().publicKey.toBase58()
    setMintSchedule({
      mint,
      startTime: Date.now() - 60000, // Already started
      endTime: Date.now() + 60000,   // Not ended yet
    }, storePath)

    const { eligible } = checkMintEligibility(mint, undefined, storePath)
    expect(eligible).toBe(true)
  })

  test('should be ineligible before start time', () => {
    const mint = Keypair.generate().publicKey.toBase58()
    setMintSchedule({
      mint,
      startTime: Date.now() + 60000, // Future start
    }, storePath)

    const { eligible, reason } = checkMintEligibility(mint, undefined, storePath)
    expect(eligible).toBe(false)
    expect(reason).toContain('not started')
  })

  test('should be ineligible after end time', () => {
    const mint = Keypair.generate().publicKey.toBase58()
    setMintSchedule({
      mint,
      startTime: Date.now() - 120000, // Past start
      endTime: Date.now() - 60000,    // Past end
    }, storePath)

    const { eligible, reason } = checkMintEligibility(mint, undefined, storePath)
    expect(eligible).toBe(false)
    expect(reason).toContain('ended')
  })

  test('should check allowlist', () => {
    const mint = Keypair.generate().publicKey.toBase58()
    const allowed = Keypair.generate().publicKey.toBase58()
    const denied = Keypair.generate().publicKey.toBase58()

    setMintSchedule({
      mint,
      allowlist: [allowed],
    }, storePath)

    const result1 = checkMintEligibility(mint, allowed, storePath)
    expect(result1.eligible).toBe(true)

    const result2 = checkMintEligibility(mint, denied, storePath)
    expect(result2.eligible).toBe(false)
    expect(result2.reason).toContain('allowlist')
  })

  test('should be eligible when no schedule exists', () => {
    const mint = Keypair.generate().publicKey.toBase58()
    const { eligible } = checkMintEligibility(mint, undefined, storePath)
    expect(eligible).toBe(true)
  })
})

// ============================================
// 6. Cron Job CRUD Tests
// ============================================

describe('createCronJob', () => {
  test('should create a cron job with valid schedule', () => {
    const job = createCronJob({
      name: 'Hourly Transfer',
      schedule: '0 * * * *',
      action: { type: 'transfer', mint: 'abc', to: 'def', amount: '100' },
    }, storePath)

    expect(job.id).toContain('cron-')
    expect(job.name).toBe('Hourly Transfer')
    expect(job.enabled).toBe(true)
    expect(job.runCount).toBe(0)
    expect(job.nextRun).toBeDefined()
    expect(job.nextRun!).toBeGreaterThan(Date.now())
  })

  test('should reject invalid cron expression', () => {
    expect(() => createCronJob({
      name: 'Bad Cron',
      schedule: 'not valid',
      action: { type: 'transfer', mint: 'a', to: 'b', amount: '1' },
    }, storePath)).toThrow()
  })
})

describe('cron CRUD operations', () => {
  test('should list, enable, disable, and remove cron jobs', () => {
    const job = createCronJob({
      name: 'Test Cron',
      schedule: '0 12 * * *',
      action: { type: 'transfer', mint: 'a', to: 'b', amount: '1' },
    }, storePath)

    // List
    let jobs = listCronJobs(storePath)
    expect(jobs.length).toBe(1)

    // Disable
    disableCronJob(job.id, storePath)
    jobs = listCronJobs(storePath)
    expect(jobs[0].enabled).toBe(false)

    // Enable
    enableCronJob(job.id, storePath)
    jobs = listCronJobs(storePath)
    expect(jobs[0].enabled).toBe(true)

    // Remove
    const removed = removeCronJob(job.id, storePath)
    expect(removed).toBe(true)

    jobs = listCronJobs(storePath)
    expect(jobs.length).toBe(0)
  })
})
