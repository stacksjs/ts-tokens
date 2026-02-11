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

  test('approval threshold below quorum produces an error', () => {
    const errors = validateDAOConfig({
      votingPeriod: '5 days',
      quorum: 60,
      approvalThreshold: 40,
    })
    expect(errors.some(e => /threshold.*>=.*quorum|threshold should be/i.test(e))).toBe(true)
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
    const recipient = Keypair.generate().publicKey
    const action = treasuryActions.transferSOL(recipient, 1_000_000_000n)
    expect(action.programId.equals(SystemProgram.programId)).toBe(true)
    expect(action.accounts.length).toBeGreaterThan(0)
    expect(action.accounts[0].pubkey.equals(recipient)).toBe(true)
    expect(Buffer.isBuffer(action.data)).toBe(true)
  })

  test('transferToken returns a ProposalAction with token program programId', () => {
    const mint = Keypair.generate().publicKey
    const recipient = Keypair.generate().publicKey
    const action = treasuryActions.transferToken(mint, recipient, 500n)
    expect(action.programId.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    expect(action.accounts.length).toBe(2)
    expect(action.accounts[0].pubkey.equals(mint)).toBe(true)
    expect(action.accounts[1].pubkey.equals(recipient)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// tokenActions
// ---------------------------------------------------------------------------

describe('tokenActions', () => {
  test('mint returns a ProposalAction with mint and recipient accounts', () => {
    const mint = Keypair.generate().publicKey
    const recipient = Keypair.generate().publicKey
    const action = tokenActions.mint(mint, recipient, 1000n)
    expect(action.programId.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    expect(action.accounts.length).toBe(2)
    expect(action.accounts[0].pubkey.equals(mint)).toBe(true)
    expect(action.accounts[0].isWritable).toBe(true)
    expect(action.accounts[1].pubkey.equals(recipient)).toBe(true)
    expect(action.accounts[1].isWritable).toBe(true)
  })

  test('burn returns a ProposalAction with only the mint account', () => {
    const mint = Keypair.generate().publicKey
    const action = tokenActions.burn(mint, 500n)
    expect(action.programId.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    expect(action.accounts.length).toBe(1)
    expect(action.accounts[0].pubkey.equals(mint)).toBe(true)
    expect(action.accounts[0].isWritable).toBe(true)
    expect(Buffer.isBuffer(action.data)).toBe(true)
  })
})
