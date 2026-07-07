/**
 * Governance Business Logic Tests
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, SystemProgram } from '@solana/web3.js'
import { validateDAOConfig } from '../src/dao/management'
import { parseDuration } from '../src/dao/create'
import {
  canExecuteProposal,
  calculateProposalResult,
  treasuryActions,
  governanceActions,
  tokenActions,
} from '../src/proposals'
import {
  calculateVoteBreakdown,
  isVotingOpen,
  getVotingTimeRemaining,
  calculateQuadraticPower,
  calculateNFTVotingPower,
} from '../src/voting'
import {
  calculateTimeWeightedPower,
  getTimeWeightedMultiplier,
} from '../src/voting/time-weighted'
import type { Proposal } from '../src/types'
import { GOVERNANCE_PROGRAM_ID } from '../src/programs/program'

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  const now = BigInt(Math.floor(Date.now() / 1000))
  return {
    address: Keypair.generate().publicKey,
    dao: Keypair.generate().publicKey,
    index: 0n,
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
// parseDuration
// ---------------------------------------------------------------------------

describe('parseDuration', () => {
  test('parses bigint directly', () => {
    expect(parseDuration(300n)).toBe(300n)
  })

  test('parses seconds', () => {
    expect(parseDuration('30 seconds')).toBe(30n)
  })

  test('parses minutes', () => {
    expect(parseDuration('5 minutes')).toBe(300n)
  })

  test('parses hours', () => {
    expect(parseDuration('2 hours')).toBe(7200n)
  })

  test('parses days', () => {
    expect(parseDuration('5 days')).toBe(432000n)
  })

  test('parses weeks', () => {
    expect(parseDuration('1 week')).toBe(604800n)
  })

  test('throws on invalid format', () => {
    expect(() => parseDuration('not-a-duration')).toThrow('Invalid duration')
  })
})

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

  test('approval threshold below quorum is valid (different denominators)', () => {
    // quorum and approvalThreshold are percentages of different denominators
    // (turnout vs. total supply), so approvalThreshold < quorum is NOT an error.
    const errors = validateDAOConfig({
      votingPeriod: '5 days',
      quorum: 60,
      approvalThreshold: 40,
    })
    expect(errors).toEqual([])
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

  test('all-abstain proposal does not pass (no deciding votes)', () => {
    // Meets quorum (500/1000 = 50% >= 10%) but has zero for/against votes, so
    // there is no support to approve. Must NOT report passed:true.
    const proposal = makeProposal({
      forVotes: 0n,
      againstVotes: 0n,
      abstainVotes: 500n,
    })
    const result = calculateProposalResult(proposal, 10, 50, 1000n)
    expect(result.passed).toBe(false)
    expect(result.reason).toMatch(/deciding/i)
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
      executionTime: now + 86400n,
    })
    const result = canExecuteProposal(proposal)
    expect(result.canExecute).toBe(false)
    expect(result.reason).toMatch(/delay/i)
  })

  test('queued proposal whose execution time has passed returns canExecute true', () => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const proposal = makeProposal({
      status: 'queued',
      executionTime: now - 60n,
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
    const proposal = makeProposal({ endTime: now + 7200n })
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
    expect(action.data.readUInt32LE(0)).toBe(2)
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
    expect(action.data[0]).toBe(8)
    expect(action.data.readBigUInt64LE(1)).toBe(500n)
  })

  test('transferAuthority (SetAuthority) encodes [6, 0, 1] + newAuthority bytes', () => {
    const mint = Keypair.generate().publicKey
    const currentAuthority = Keypair.generate().publicKey
    const newAuthority = Keypair.generate().publicKey
    const action = tokenActions.transferAuthority(mint, currentAuthority, newAuthority)
    expect(action.programId.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    expect(action.accounts.length).toBe(2)
    expect(action.accounts[0].pubkey.equals(mint)).toBe(true)
    expect(action.accounts[0].isWritable).toBe(true)
    expect(action.accounts[1].pubkey.equals(currentAuthority)).toBe(true)
    expect(action.accounts[1].isSigner).toBe(true)
    expect(action.data.length).toBe(3 + 32)
    expect(action.data[0]).toBe(6)
    expect(action.data[1]).toBe(0)
    expect(action.data[2]).toBe(1)
    expect(Buffer.from(action.data.subarray(3)).equals(newAuthority.toBuffer())).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// governanceActions
// ---------------------------------------------------------------------------

describe('governanceActions', () => {
  test('updateConfig uses governance program ID', () => {
    const action = governanceActions.updateConfig({ quorum: 20 })
    expect(action.programId.toBase58()).toBe(GOVERNANCE_PROGRAM_ID.toBase58())
  })

  test('updateConfig serializes bigint fields without throwing', () => {
    // votingPeriod/executionDelay are bigint; JSON.stringify would throw on them.
    // The real serializer must encode them into the instruction data.
    const action = governanceActions.updateConfig({
      votingPeriod: 432000n,
      executionDelay: 86400n,
      quorum: 20,
      approvalThreshold: 66,
    })
    expect(Buffer.isBuffer(action.data)).toBe(true)
    // discriminator(8) + votingPeriod(1+8) + quorum(1+2) + approvalThreshold(1+2)
    // + executionDelay(1+8) = 32 bytes
    expect(action.data.length).toBe(32)
    // updateDaoConfig discriminator is byte 1
    expect(action.data[0]).toBe(1)
    // votingPeriod present flag + value
    expect(action.data[8]).toBe(1)
    expect(action.data.readBigUInt64LE(9)).toBe(432000n)
  })

  test('updateConfig includes the DAO account meta when a dao is provided', () => {
    const dao = Keypair.generate().publicKey
    const action = governanceActions.updateConfig({ quorum: 20 }, dao)
    expect(action.accounts.length).toBe(1)
    expect(action.accounts[0].pubkey.equals(dao)).toBe(true)
    expect(action.accounts[0].isWritable).toBe(true)
  })

  test('addVetoAuthority includes authority account', () => {
    const authority = Keypair.generate().publicKey
    const action = governanceActions.addVetoAuthority(authority)
    expect(action.accounts.length).toBe(1)
    expect(action.accounts[0].pubkey.equals(authority)).toBe(true)
  })

  test('removeVetoAuthority has no accounts', () => {
    const action = governanceActions.removeVetoAuthority()
    expect(action.accounts.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Time-weighted voting (new feature)
// ---------------------------------------------------------------------------

describe('Time-weighted voting', () => {
  test('getTimeWeightedMultiplier returns 1.0 at 0 duration', () => {
    expect(getTimeWeightedMultiplier(0n)).toBe(1.0)
  })

  test('getTimeWeightedMultiplier returns maxMultiplier at max duration (linear)', () => {
    const multiplier = getTimeWeightedMultiplier(31536000n, {
      curve: 'linear',
      maxMultiplier: 3.0,
      maxDurationSeconds: 31536000n,
    })
    expect(multiplier).toBeCloseTo(3.0, 5)
  })

  test('getTimeWeightedMultiplier returns 2.0 at half duration (linear)', () => {
    const halfYear = 15768000n
    const multiplier = getTimeWeightedMultiplier(halfYear, {
      curve: 'linear',
      maxMultiplier: 3.0,
      maxDurationSeconds: 31536000n,
    })
    expect(multiplier).toBeCloseTo(2.0, 1)
  })

  test('getTimeWeightedMultiplier caps at maxDuration', () => {
    const doubleMax = 63072000n
    const multiplier = getTimeWeightedMultiplier(doubleMax, {
      curve: 'linear',
      maxMultiplier: 3.0,
      maxDurationSeconds: 31536000n,
    })
    expect(multiplier).toBeCloseTo(3.0, 5)
  })

  test('exponential curve returns maxMultiplier at max duration', () => {
    const multiplier = getTimeWeightedMultiplier(31536000n, {
      curve: 'exponential',
      maxMultiplier: 3.0,
      maxDurationSeconds: 31536000n,
    })
    expect(multiplier).toBeCloseTo(3.0, 5)
  })

  test('calculateTimeWeightedPower returns 0 for 0 base', () => {
    expect(calculateTimeWeightedPower(0n, 1000n)).toBe(0n)
  })

  test('calculateTimeWeightedPower scales correctly', () => {
    const power = calculateTimeWeightedPower(1000n, 31536000n, {
      curve: 'linear',
      maxMultiplier: 3.0,
      maxDurationSeconds: 31536000n,
    })
    expect(power).toBe(3000n)
  })

  test('calculateTimeWeightedPower at half duration', () => {
    const power = calculateTimeWeightedPower(1000n, 15768000n, {
      curve: 'linear',
      maxMultiplier: 3.0,
      maxDurationSeconds: 31536000n,
    })
    // multiplier ~2.0, so power ~2000
    expect(power).toBeGreaterThanOrEqual(1990n)
    expect(power).toBeLessThanOrEqual(2010n)
  })
})

// ---------------------------------------------------------------------------
// Quadratic voting
// ---------------------------------------------------------------------------

describe('Quadratic voting', () => {
  test('returns 0 for 0 balance', () => {
    expect(calculateQuadraticPower(0n)).toBe(0n)
  })

  test('returns 1 for 1 token', () => {
    expect(calculateQuadraticPower(1n)).toBe(1n)
  })

  test('returns 10 for 100 tokens', () => {
    expect(calculateQuadraticPower(100n)).toBe(10n)
  })

  test('returns 31 for 1000 tokens', () => {
    // sqrt(1000) ≈ 31.6, integer sqrt = 31
    expect(calculateQuadraticPower(1000n)).toBe(31n)
  })

  test('returns 100 for 10000 tokens', () => {
    expect(calculateQuadraticPower(10000n)).toBe(100n)
  })
})

// ---------------------------------------------------------------------------
// NFT voting power
// ---------------------------------------------------------------------------

describe('NFT voting power', () => {
  test('returns 0 for 0 NFTs', () => {
    expect(calculateNFTVotingPower(0)).toBe(0n)
  })

  test('returns 5 for 5 NFTs', () => {
    expect(calculateNFTVotingPower(5)).toBe(5n)
  })
})

// ---------------------------------------------------------------------------
// Delegation lifecycle
// ---------------------------------------------------------------------------

describe('Delegation lifecycle', () => {
  test('getDelegationAddress is deterministic', () => {
    const { getDelegationAddress } = require('../src/programs/program')
    const dao = Keypair.generate().publicKey
    const delegator = Keypair.generate().publicKey
    const addr1 = getDelegationAddress(dao, delegator)
    const addr2 = getDelegationAddress(dao, delegator)
    expect(addr1.toBase58()).toBe(addr2.toBase58())
  })

  test('different delegators produce different PDAs', () => {
    const { getDelegationAddress } = require('../src/programs/program')
    const dao = Keypair.generate().publicKey
    const del1 = Keypair.generate().publicKey
    const del2 = Keypair.generate().publicKey
    const addr1 = getDelegationAddress(dao, del1)
    const addr2 = getDelegationAddress(dao, del2)
    expect(addr1.toBase58()).not.toBe(addr2.toBase58())
  })
})

// ---------------------------------------------------------------------------
// Treasury
// ---------------------------------------------------------------------------

describe('Treasury', () => {
  test('getTreasuryAddress is deterministic', () => {
    const { getTreasuryAddress } = require('../src/programs/program')
    const dao = Keypair.generate().publicKey
    const addr1 = getTreasuryAddress(dao)
    const addr2 = getTreasuryAddress(dao)
    expect(addr1.toBase58()).toBe(addr2.toBase58())
  })
})
