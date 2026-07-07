/**
 * Governance Tests
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, SystemProgram } from '@solana/web3.js'
import { validateDAOConfig } from '../src/governance/dao'
import {
  calculateProposalResult,
  canExecuteProposal,
  treasuryActions,
  tokenActions,
} from '../src/governance/proposal'
import {
  calculateVoteBreakdown,
  isVotingOpen,
  getVotingTimeRemaining,
} from '../src/governance/vote'
import type { Proposal } from '../src/governance/types'

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  const now = BigInt(Math.floor(Date.now() / 1000))
  return {
    address: Keypair.generate().publicKey,
    dao: Keypair.generate().publicKey,
    proposer: Keypair.generate().publicKey,
    title: 'Test Proposal',
    description: 'A test proposal',
    status: 'active',
    forVotes: 0n,
    againstVotes: 0n,
    abstainVotes: 0n,
    startTime: now - 3600n,
    endTime: now + 3600n,
    actions: [],
    createdAt: now - 3600n,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// validateDAOConfig
// ---------------------------------------------------------------------------

describe('validateDAOConfig', () => {
  test('valid config returns an empty error array', () => {
    const errors = validateDAOConfig({
      votingPeriod: '5 days',
      quorum: 10,
      approvalThreshold: 66,
    })
    expect(errors).toEqual([])
  })

  test('quorum of 0 produces an error', () => {
    const errors = validateDAOConfig({
      votingPeriod: '5 days',
      quorum: 0,
      approvalThreshold: 50,
    })
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => /quorum/i.test(e))).toBe(true)
  })

  test('quorum of 101 produces an error', () => {
    const errors = validateDAOConfig({
      votingPeriod: '5 days',
      quorum: 101,
      approvalThreshold: 101,
    })
    expect(errors.some(e => /quorum/i.test(e))).toBe(true)
  })

  test('approval threshold less than 1 produces an error', () => {
    const errors = validateDAOConfig({
      votingPeriod: '5 days',
      quorum: 10,
      approvalThreshold: 0,
    })
    expect(errors.some(e => /approval threshold/i.test(e))).toBe(true)
  })

  test('approvalThreshold below quorum is VALID (different denominators)', () => {
    // quorum = % of total supply that must participate; approvalThreshold = % of
    // cast for/against votes required to pass. They are not comparable, so
    // quorum 60% / threshold 51% must NOT be flagged as an error.
    const errors = validateDAOConfig({
      votingPeriod: '5 days',
      quorum: 60,
      approvalThreshold: 51,
    })
    expect(errors).toHaveLength(0)
  })

  test('invalid voting period format produces an error', () => {
    const errors = validateDAOConfig({
      votingPeriod: 'not-a-duration',
      quorum: 10,
      approvalThreshold: 50,
    })
    expect(errors.some(e => /voting period/i.test(e))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// calculateProposalResult
// ---------------------------------------------------------------------------

describe('calculateProposalResult', () => {
  test('quorum not reached returns passed false', () => {
    const proposal = makeProposal({
      forVotes: 5n,
      againstVotes: 0n,
      abstainVotes: 0n,
    })
    const result = calculateProposalResult(proposal, 10, 50, 1000n)
    expect(result.passed).toBe(false)
    expect(result.reason).toMatch(/quorum/i)
  })

  test('approval threshold not met returns passed false', () => {
    const proposal = makeProposal({
      forVotes: 40n,
      againstVotes: 60n,
      abstainVotes: 0n,
    })
    const result = calculateProposalResult(proposal, 10, 66, 1000n)
    expect(result.passed).toBe(false)
    expect(result.reason).toMatch(/threshold/i)
  })

  test('proposal that meets quorum and threshold passes', () => {
    const proposal = makeProposal({
      forVotes: 700n,
      againstVotes: 200n,
      abstainVotes: 100n,
    })
    const result = calculateProposalResult(proposal, 10, 50, 1000n)
    expect(result.passed).toBe(true)
    expect(result.reason).toMatch(/passed/i)
  })

  test('all-abstain proposal does NOT pass even when quorum is met', () => {
    // Regression: with 0 for/against, the threshold check was 0 < 0 = false,
    // so the gate was skipped and the proposal was reported as passed.
    const proposal = makeProposal({
      forVotes: 0n,
      againstVotes: 0n,
      abstainVotes: 500n,
    })
    const result = calculateProposalResult(proposal, 10, 50, 1000n)
    expect(result.passed).toBe(false)
    expect(result.reason).toMatch(/no deciding/i)
  })
})

// ---------------------------------------------------------------------------
// canExecuteProposal
// ---------------------------------------------------------------------------

describe('canExecuteProposal', () => {
  test('proposal not in queued status returns canExecute false', () => {
    const proposal = makeProposal({ status: 'active' })
    const result = canExecuteProposal(proposal)
    expect(result.canExecute).toBe(false)
    expect(result.reason).toMatch(/not queued/i)
  })

  test('queued proposal whose execution delay has not passed returns canExecute false', () => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const proposal = makeProposal({
      status: 'queued',
      executionTime: now + 86400n, // 1 day in the future
    })
    const result = canExecuteProposal(proposal)
    expect(result.canExecute).toBe(false)
    expect(result.reason).toMatch(/delay/i)
  })

  test('queued proposal whose execution time has passed returns canExecute true', () => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const proposal = makeProposal({
      status: 'queued',
      executionTime: now - 60n, // 1 minute in the past
    })
    const result = canExecuteProposal(proposal)
    expect(result.canExecute).toBe(true)
    expect(result.reason).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// calculateVoteBreakdown
// ---------------------------------------------------------------------------

describe('calculateVoteBreakdown', () => {
  test('zero votes returns all percentages as 0', () => {
    const proposal = makeProposal({
      forVotes: 0n,
      againstVotes: 0n,
      abstainVotes: 0n,
    })
    const breakdown = calculateVoteBreakdown(proposal)
    expect(breakdown.forPercentage).toBe(0)
    expect(breakdown.againstPercentage).toBe(0)
    expect(breakdown.abstainPercentage).toBe(0)
    expect(breakdown.totalVotes).toBe(0n)
  })

  test('votes produce correct percentages', () => {
    const proposal = makeProposal({
      forVotes: 60n,
      againstVotes: 30n,
      abstainVotes: 10n,
    })
    const breakdown = calculateVoteBreakdown(proposal)
    expect(breakdown.forPercentage).toBe(60)
    expect(breakdown.againstPercentage).toBe(30)
    expect(breakdown.abstainPercentage).toBe(10)
    expect(breakdown.totalVotes).toBe(100n)
  })
})

// ---------------------------------------------------------------------------
// isVotingOpen
// ---------------------------------------------------------------------------

describe('isVotingOpen', () => {
  test('active proposal within time range returns true', () => {
    const proposal = makeProposal({ status: 'active' })
    expect(isVotingOpen(proposal)).toBe(true)
  })

  test('active proposal whose endTime has passed returns false', () => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const proposal = makeProposal({
      status: 'active',
      startTime: now - 7200n,
      endTime: now - 60n,
    })
    expect(isVotingOpen(proposal)).toBe(false)
  })

  test('non-active status returns false even if within time range', () => {
    const proposal = makeProposal({ status: 'succeeded' })
    expect(isVotingOpen(proposal)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getVotingTimeRemaining
// ---------------------------------------------------------------------------

describe('getVotingTimeRemaining', () => {
  test('past endTime returns 0 seconds and "Ended"', () => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const proposal = makeProposal({ endTime: now - 100n })
    const remaining = getVotingTimeRemaining(proposal)
    expect(remaining.seconds).toBe(0n)
    expect(remaining.formatted).toBe('Ended')
  })

  test('future endTime returns positive seconds', () => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const proposal = makeProposal({ endTime: now + 7200n }) // 2 hours
    const remaining = getVotingTimeRemaining(proposal)
    expect(remaining.seconds).toBeGreaterThan(0n)
    expect(remaining.formatted).not.toBe('Ended')
  })
})

// ---------------------------------------------------------------------------
// treasuryActions
// ---------------------------------------------------------------------------

describe('treasuryActions', () => {
  test('transferSOL returns a ProposalAction with SystemProgram programId', () => {
    const from = Keypair.generate().publicKey
    const recipient = Keypair.generate().publicKey
    const action = treasuryActions.transferSOL(from, recipient, 1_000_000_000n)
    expect(action.programId.equals(SystemProgram.programId)).toBe(true)
    // [from (signer, writable), to (writable)]
    expect(action.accounts.length).toBe(2)
    expect(action.accounts[0].pubkey.equals(from)).toBe(true)
    expect(action.accounts[0].isSigner).toBe(true)
    expect(action.accounts[0].isWritable).toBe(true)
    expect(action.accounts[1].pubkey.equals(recipient)).toBe(true)
    expect(action.accounts[1].isWritable).toBe(true)
    expect(Buffer.isBuffer(action.data)).toBe(true)
  })

  test('transferSOL encodes a 4-byte u32 LE index (2) followed by u64 LE lamports', () => {
    const from = Keypair.generate().publicKey
    const recipient = Keypair.generate().publicKey
    const lamports = 1_234_567_890n
    const action = treasuryActions.transferSOL(from, recipient, lamports)

    expect(action.data.length).toBe(12)
    // 4-byte u32 LE instruction index = 2
    expect(action.data.readUInt32LE(0)).toBe(2)
    // 8-byte u64 LE lamports
    expect(action.data.readBigUInt64LE(4)).toBe(lamports)
  })

  test('transferToken uses source/dest token accounts and an owner signer', () => {
    const source = Keypair.generate().publicKey
    const dest = Keypair.generate().publicKey
    const owner = Keypair.generate().publicKey
    const action = treasuryActions.transferToken(source, dest, owner, 500n)
    expect(action.programId.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    expect(action.accounts.length).toBe(3)
    expect(action.accounts[0].pubkey.equals(source)).toBe(true)
    expect(action.accounts[0].isWritable).toBe(true)
    expect(action.accounts[1].pubkey.equals(dest)).toBe(true)
    expect(action.accounts[1].isWritable).toBe(true)
    expect(action.accounts[2].pubkey.equals(owner)).toBe(true)
    expect(action.accounts[2].isSigner).toBe(true)
    // Transfer (3) + u64 LE amount
    expect(action.data[0]).toBe(3)
    expect(action.data.readBigUInt64LE(1)).toBe(500n)
  })
})

// ---------------------------------------------------------------------------
// tokenActions
// ---------------------------------------------------------------------------

describe('tokenActions', () => {
  test('mint (MintTo) returns mint, destination token account, and authority signer', () => {
    const mint = Keypair.generate().publicKey
    const destination = Keypair.generate().publicKey
    const authority = Keypair.generate().publicKey
    const action = tokenActions.mint(mint, destination, authority, 1000n)
    expect(action.programId.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    expect(action.accounts.length).toBe(3)
    expect(action.accounts[0].pubkey.equals(mint)).toBe(true)
    expect(action.accounts[0].isWritable).toBe(true)
    expect(action.accounts[1].pubkey.equals(destination)).toBe(true)
    expect(action.accounts[1].isWritable).toBe(true)
    expect(action.accounts[2].pubkey.equals(authority)).toBe(true)
    expect(action.accounts[2].isSigner).toBe(true)
    // MintTo (7) + u64 LE amount
    expect(action.data[0]).toBe(7)
    expect(action.data.readBigUInt64LE(1)).toBe(1000n)
  })

  test('burn (Burn) returns token account, mint, and owner signer', () => {
    const tokenAccount = Keypair.generate().publicKey
    const mint = Keypair.generate().publicKey
    const owner = Keypair.generate().publicKey
    const action = tokenActions.burn(tokenAccount, mint, owner, 500n)
    expect(action.programId.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    expect(action.accounts.length).toBe(3)
    expect(action.accounts[0].pubkey.equals(tokenAccount)).toBe(true)
    expect(action.accounts[0].isWritable).toBe(true)
    expect(action.accounts[1].pubkey.equals(mint)).toBe(true)
    expect(action.accounts[1].isWritable).toBe(true)
    expect(action.accounts[2].pubkey.equals(owner)).toBe(true)
    expect(action.accounts[2].isSigner).toBe(true)
    // Burn (8) + u64 LE amount
    expect(action.data[0]).toBe(8)
    expect(action.data.readBigUInt64LE(1)).toBe(500n)
  })

  test('transferAuthority (SetAuthority) encodes [6, 0, 1] + newAuthority bytes', () => {
    const mint = Keypair.generate().publicKey
    const currentAuthority = Keypair.generate().publicKey
    const newAuthority = Keypair.generate().publicKey
    const action = tokenActions.transferAuthority(mint, currentAuthority, newAuthority)
    expect(action.programId.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    // [mint (writable), current authority (signer)]
    expect(action.accounts.length).toBe(2)
    expect(action.accounts[0].pubkey.equals(mint)).toBe(true)
    expect(action.accounts[0].isWritable).toBe(true)
    expect(action.accounts[1].pubkey.equals(currentAuthority)).toBe(true)
    expect(action.accounts[1].isSigner).toBe(true)
    // SetAuthority (6), authorityType 0 (MintTokens), option 1 (Some), then 32-byte pubkey
    expect(action.data.length).toBe(3 + 32)
    expect(action.data[0]).toBe(6)
    expect(action.data[1]).toBe(0)
    expect(action.data[2]).toBe(1)
    expect(Buffer.from(action.data.subarray(3)).equals(newAuthority.toBuffer())).toBe(true)
  })
})
