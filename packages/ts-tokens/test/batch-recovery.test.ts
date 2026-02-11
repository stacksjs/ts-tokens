/**
 * Batch Recovery Tests
 *
 * Tests for recovery state lifecycle, save/load round-trip,
 * retry extraction, and summary formatting.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  createRecoveryState,
  recordSuccess,
  recordFailure,
  finalizeRecoveryState,
  saveRecoveryState,
  loadRecoveryState,
  getRetryItems,
  formatRecoverySummary,
} from '../src/batch/recovery'

function addr(): string {
  return Keypair.generate().publicKey.toBase58()
}

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recovery-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// createRecoveryState
// ---------------------------------------------------------------------------

describe('createRecoveryState', () => {
  test('creates state with all items pending', () => {
    const recipients = [
      { address: addr(), amount: '100' },
      { address: addr(), amount: '200' },
      { address: addr(), amount: '300' },
    ]
    const state = createRecoveryState({ operation: 'batch-transfer', recipients })

    expect(state.id).toMatch(/^recovery-/)
    expect(state.operation).toBe('batch-transfer')
    expect(state.status).toBe('in-progress')
    expect(state.items).toHaveLength(3)
    expect(state.items.every(i => i.status === 'pending')).toBe(true)
    expect(state.items[0].index).toBe(0)
    expect(state.items[1].index).toBe(1)
    expect(state.items[2].index).toBe(2)
  })

  test('stores amount and metadata on items', () => {
    const recipients = [
      { address: addr(), amount: '500', metadata: { memo: 'test' } },
    ]
    const state = createRecoveryState({ operation: 'airdrop', recipients })

    expect(state.items[0].amount).toBe('500')
    expect(state.items[0].metadata).toEqual({ memo: 'test' })
  })
})

// ---------------------------------------------------------------------------
// recordSuccess / recordFailure
// ---------------------------------------------------------------------------

describe('recordSuccess', () => {
  test('marks item as success with signature', () => {
    const a = addr()
    const state = createRecoveryState({
      operation: 'transfer',
      recipients: [{ address: a }],
    })

    recordSuccess(state, 0, a, 'sig123')

    expect(state.items[0].status).toBe('success')
    expect(state.items[0].signature).toBe('sig123')
  })

  test('throws for invalid index', () => {
    const state = createRecoveryState({
      operation: 'transfer',
      recipients: [{ address: addr() }],
    })
    expect(() => recordSuccess(state, 5, addr(), 'sig')).toThrow('Invalid recovery item index')
  })
})

describe('recordFailure', () => {
  test('marks item as failed with error', () => {
    const a = addr()
    const state = createRecoveryState({
      operation: 'transfer',
      recipients: [{ address: a }],
    })

    recordFailure(state, 0, a, 'Insufficient balance')

    expect(state.items[0].status).toBe('failed')
    expect(state.items[0].error).toBe('Insufficient balance')
  })

  test('throws for invalid index', () => {
    const state = createRecoveryState({
      operation: 'transfer',
      recipients: [{ address: addr() }],
    })
    expect(() => recordFailure(state, 99, addr(), 'err')).toThrow('Invalid recovery item index')
  })
})

// ---------------------------------------------------------------------------
// finalizeRecoveryState
// ---------------------------------------------------------------------------

describe('finalizeRecoveryState', () => {
  test('sets status to completed when all succeed', () => {
    const recipients = [{ address: addr() }, { address: addr() }]
    const state = createRecoveryState({ operation: 'transfer', recipients })

    recordSuccess(state, 0, recipients[0].address, 'sig1')
    recordSuccess(state, 1, recipients[1].address, 'sig2')
    finalizeRecoveryState(state)

    expect(state.status).toBe('completed')
    expect(state.summary!.successful).toBe(2)
    expect(state.summary!.failed).toBe(0)
    expect(state.summary!.pending).toBe(0)
  })

  test('sets status to partial-failure when some fail', () => {
    const recipients = [{ address: addr() }, { address: addr() }]
    const state = createRecoveryState({ operation: 'transfer', recipients })

    recordSuccess(state, 0, recipients[0].address, 'sig1')
    recordFailure(state, 1, recipients[1].address, 'timeout')
    finalizeRecoveryState(state)

    expect(state.status).toBe('partial-failure')
    expect(state.summary!.successful).toBe(1)
    expect(state.summary!.failed).toBe(1)
  })

  test('sets status to partial-failure when items are still pending', () => {
    const recipients = [{ address: addr() }, { address: addr() }]
    const state = createRecoveryState({ operation: 'transfer', recipients })

    recordSuccess(state, 0, recipients[0].address, 'sig1')
    // item 1 left pending
    finalizeRecoveryState(state)

    expect(state.status).toBe('partial-failure')
    expect(state.summary!.pending).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// saveRecoveryState / loadRecoveryState
// ---------------------------------------------------------------------------

describe('saveRecoveryState / loadRecoveryState', () => {
  test('round-trip: save then load returns equivalent state', () => {
    const recipients = [{ address: addr(), amount: '100' }]
    const state = createRecoveryState({ operation: 'transfer', recipients })
    recordSuccess(state, 0, recipients[0].address, 'sig-abc')
    finalizeRecoveryState(state)

    const filePath = path.join(tmpDir, 'recovery.json')
    saveRecoveryState(state, filePath)

    const loaded = loadRecoveryState(filePath)
    expect(loaded.id).toBe(state.id)
    expect(loaded.operation).toBe('transfer')
    expect(loaded.status).toBe('completed')
    expect(loaded.items[0].signature).toBe('sig-abc')
    expect(loaded.summary!.successful).toBe(1)
  })

  test('load throws for non-existent file', () => {
    expect(() => loadRecoveryState('/tmp/nonexistent-recovery-xyz.json')).toThrow(
      'Recovery state file not found'
    )
  })

  test('saved file has restricted permissions', () => {
    const state = createRecoveryState({
      operation: 'transfer',
      recipients: [{ address: addr() }],
    })
    const filePath = path.join(tmpDir, 'recovery.json')
    saveRecoveryState(state, filePath)

    const stats = fs.statSync(filePath)
    const mode = stats.mode & 0o777
    expect(mode).toBe(0o600)
  })
})

// ---------------------------------------------------------------------------
// getRetryItems
// ---------------------------------------------------------------------------

describe('getRetryItems', () => {
  test('returns only failed items', () => {
    const recipients = [
      { address: addr() },
      { address: addr() },
      { address: addr() },
    ]
    const state = createRecoveryState({ operation: 'transfer', recipients })

    recordSuccess(state, 0, recipients[0].address, 'sig1')
    recordFailure(state, 1, recipients[1].address, 'error1')
    recordFailure(state, 2, recipients[2].address, 'error2')
    finalizeRecoveryState(state)

    const retries = getRetryItems(state)
    expect(retries).toHaveLength(2)
    expect(retries[0].index).toBe(1)
    expect(retries[1].index).toBe(2)
  })

  test('returns empty array when no failures', () => {
    const recipients = [{ address: addr() }]
    const state = createRecoveryState({ operation: 'transfer', recipients })
    recordSuccess(state, 0, recipients[0].address, 'sig')
    finalizeRecoveryState(state)

    expect(getRetryItems(state)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// formatRecoverySummary
// ---------------------------------------------------------------------------

describe('formatRecoverySummary', () => {
  test('includes operation and counts', () => {
    const recipients = [
      { address: addr() },
      { address: addr() },
    ]
    const state = createRecoveryState({ operation: 'batch-transfer', recipients })
    recordSuccess(state, 0, recipients[0].address, 'sig')
    recordFailure(state, 1, recipients[1].address, 'timeout')
    finalizeRecoveryState(state)

    const summary = formatRecoverySummary(state)
    expect(summary).toContain('batch-transfer')
    expect(summary).toContain('Successful: 1')
    expect(summary).toContain('Failed: 1')
    expect(summary).toContain('Failed Items:')
    expect(summary).toContain('timeout')
  })

  test('does not show failed items section when no failures', () => {
    const recipients = [{ address: addr() }]
    const state = createRecoveryState({ operation: 'transfer', recipients })
    recordSuccess(state, 0, recipients[0].address, 'sig')
    finalizeRecoveryState(state)

    const summary = formatRecoverySummary(state)
    expect(summary).not.toContain('Failed Items:')
  })
})
