/**
 * Tests for the testing/rehearsal harness (airdrop retries + report formatting).
 *
 * These use a stub connection and never touch the network.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { airdrop, airdropIfNeeded, getBalanceSol } from '../src/testing/airdrop'
import { formatRehearsalReport } from '../src/testing/rehearsal'
import type { RehearsalReport } from '../src/testing/rehearsal'

function stubConnection(opts: {
  balances?: number[] // successive getBalance results (lamports)
  airdropFailuresBeforeSuccess?: number
}): any {
  const balances = opts.balances ? [...opts.balances] : [0]
  let airdropCalls = 0
  const fail = opts.airdropFailuresBeforeSuccess ?? 0
  return {
    _airdropCalls: () => airdropCalls,
    async getBalance() {
      return balances.length > 1 ? balances.shift()! : balances[0]
    },
    async requestAirdrop() {
      airdropCalls++
      if (airdropCalls <= fail) {
        throw new Error('airdrop failed: Internal error')
      }
      return 'sig-' + airdropCalls
    },
    async getLatestBlockhash() {
      return { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 100 }
    },
    async confirmTransaction() {
      return { value: { err: null } }
    },
  }
}

describe('airdrop', () => {
  test('getBalanceSol converts lamports to SOL', async () => {
    const conn = stubConnection({ balances: [2 * LAMPORTS_PER_SOL] })
    expect(await getBalanceSol(conn, Keypair.generate().publicKey)).toBe(2)
  })

  test('retries through transient faucet failures then succeeds', async () => {
    const conn = stubConnection({
      airdropFailuresBeforeSuccess: 2,
      balances: [1 * LAMPORTS_PER_SOL],
    })
    const result = await airdrop(conn, Keypair.generate().publicKey, {
      sol: 1,
      retryDelayMs: 1,
      maxRetries: 5,
    })
    expect(result.signatures.length).toBe(1)
    expect(conn._airdropCalls()).toBe(3) // 2 fail + 1 success
    expect(result.balanceSol).toBe(1)
  })

  test('throws an actionable error after exhausting retries', async () => {
    const conn = stubConnection({ airdropFailuresBeforeSuccess: 99, balances: [0] })
    await expect(
      airdrop(conn, Keypair.generate().publicKey, { sol: 1, retryDelayMs: 1, maxRetries: 3 }),
    ).rejects.toThrow(/Airdrop failed after 3 attempts/)
  })

  test('airdropIfNeeded is a no-op when already funded', async () => {
    const conn = stubConnection({ balances: [5 * LAMPORTS_PER_SOL] })
    const bal = await airdropIfNeeded(conn, Keypair.generate().publicKey, 1, { retryDelayMs: 1 })
    expect(bal).toBe(5)
    expect(conn._airdropCalls()).toBe(0)
  })

  test('airdropIfNeeded funds the shortfall', async () => {
    // starts at 0, then reads 2 SOL after the airdrop round
    const conn = stubConnection({ balances: [0, 2 * LAMPORTS_PER_SOL] })
    const bal = await airdropIfNeeded(conn, Keypair.generate().publicKey, 1, { sol: 2, retryDelayMs: 1 })
    expect(bal).toBe(2)
    expect(conn._airdropCalls()).toBe(1)
  })
})

describe('formatRehearsalReport', () => {
  test('renders a passing report with step lines', () => {
    const report: RehearsalReport = {
      network: 'devnet',
      wallet: 'Wa11etPubKey',
      passed: true,
      totalMs: 1234,
      steps: [
        { name: 'fund wallet', ok: true, ms: 500, detail: '1 SOL' },
        { name: 'create collection', ok: true, ms: 700, address: 'Co11ection' },
      ],
      collection: 'Co11ection',
      nfts: ['Nft1', 'Nft2'],
      explorer: (id: string) => `https://explorer.solana.com/address/${id}?cluster=devnet`,
    }
    const out = formatRehearsalReport(report)
    expect(out).toContain('PASSED')
    expect(out).toContain('fund wallet')
    expect(out).toContain('create collection')
    expect(out).toContain('minted: 2 NFT(s)')
  })

  test('renders a failing report with the error', () => {
    const report: RehearsalReport = {
      network: 'devnet',
      wallet: 'Wa11etPubKey',
      passed: false,
      totalMs: 10,
      steps: [{ name: 'fund wallet', ok: false, ms: 10, error: 'faucet down' }],
      nfts: [],
      explorer: (id: string) => id,
    }
    const out = formatRehearsalReport(report)
    expect(out).toContain('FAILED')
    expect(out).toContain('faucet down')
  })
})
