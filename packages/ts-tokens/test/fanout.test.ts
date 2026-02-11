/**
 * Fanout Wallet Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { Keypair } from '@solana/web3.js'
import {
  createFanoutWallet,
  getFanoutWallet,
  listFanoutWallets,
  loadFanoutState,
  saveFanoutState,
} from '../src/fanout/create'
import {
  addFanoutMember,
  removeFanoutMember,
  updateMemberShares,
  deleteFanoutWallet,
  formatFanoutWallet,
} from '../src/fanout/manage'
import { previewDistribution } from '../src/fanout/distribute'
import type { TokenConfig } from '../src/types'

const TEST_STATE_PATH = path.join(os.tmpdir(), `fanout-test-${Date.now()}.json`)

// Clean up test state before and after
beforeEach(() => {
  if (fs.existsSync(TEST_STATE_PATH)) fs.unlinkSync(TEST_STATE_PATH)
  saveFanoutState({ wallets: {} }, TEST_STATE_PATH)
})

afterEach(() => {
  if (fs.existsSync(TEST_STATE_PATH)) fs.unlinkSync(TEST_STATE_PATH)
})

// We need to use the store path. Since the functions use a default path,
// we'll test the state management functions directly.

describe('Fanout State Management', () => {
  test('loadFanoutState returns empty state for nonexistent file', () => {
    const state = loadFanoutState('/tmp/nonexistent-fanout.json')
    expect(state.wallets).toEqual({})
  })

  test('saveFanoutState and loadFanoutState round-trip', () => {
    const state = {
      wallets: {
        'test-1': {
          id: 'test-1',
          name: 'Test Fanout',
          authority: 'auth123',
          membershipModel: 'wallet' as const,
          members: [{ address: 'addr1', shares: 50, totalClaimed: '0' }],
          totalShares: 50,
          totalInflow: '0',
          totalDistributed: '0',
          createdAt: Date.now(),
        },
      },
    }

    saveFanoutState(state, TEST_STATE_PATH)
    const loaded = loadFanoutState(TEST_STATE_PATH)

    expect(loaded.wallets['test-1'].name).toBe('Test Fanout')
    expect(loaded.wallets['test-1'].members.length).toBe(1)
  })
})

describe('previewDistribution', () => {
  test('returns empty for nonexistent fanout', () => {
    const preview = previewDistribution('nonexistent', 1_000_000_000n)
    expect(preview).toHaveLength(0)
  })
})

describe('formatFanoutWallet', () => {
  test('formats wallet correctly', () => {
    const fanout = {
      id: 'test-1',
      name: 'Revenue Split',
      authority: 'auth123',
      membershipModel: 'wallet' as const,
      members: [
        { address: 'addr1', shares: 70, totalClaimed: 100n },
        { address: 'addr2', shares: 30, totalClaimed: 50n },
      ],
      totalShares: 100,
      totalInflow: 0n,
      totalDistributed: 150n,
      createdAt: Date.now(),
    }

    const formatted = formatFanoutWallet(fanout)
    expect(formatted).toContain('Revenue Split')
    expect(formatted).toContain('wallet')
    expect(formatted).toContain('70.0%')
    expect(formatted).toContain('30.0%')
    expect(formatted).toContain('Members (2)')
  })
})
