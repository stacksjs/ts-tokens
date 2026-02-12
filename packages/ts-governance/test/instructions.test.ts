/**
 * Instruction Builder Tests
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import { GOVERNANCE_PROGRAM_ID, DISCRIMINATORS } from '../src/programs/program'
import {
  createCreateDaoInstruction,
  createUpdateDaoConfigInstruction,
  createSetDaoAuthorityInstruction,
  createCreateProposalInstruction,
  createCancelProposalInstruction,
  createExecuteProposalInstruction,
  createCastVoteInstruction,
  createChangeVoteInstruction,
  createWithdrawVoteInstruction,
  createDelegateVotesInstruction,
  createUndelegateInstruction,
  createAcceptDelegationInstruction,
  createCreateTreasuryInstruction,
  createDepositToTreasuryInstruction,
  createWithdrawFromTreasuryInstruction,
} from '../src/programs/instructions'

const authority = Keypair.generate().publicKey
const dao = Keypair.generate().publicKey
const proposal = Keypair.generate().publicKey
const treasury = Keypair.generate().publicKey
const voter = Keypair.generate().publicKey
const voteRecord = Keypair.generate().publicKey
const governanceToken = Keypair.generate().publicKey
const delegator = Keypair.generate().publicKey
const delegate = Keypair.generate().publicKey
const delegationAccount = Keypair.generate().publicKey
const tokenAccount = Keypair.generate().publicKey
const recipientTokenAccount = Keypair.generate().publicKey
const newAuthority = Keypair.generate().publicKey

// ---------------------------------------------------------------------------
// DAO Instructions
// ---------------------------------------------------------------------------

describe('DAO instruction builders', () => {
  test('createCreateDaoInstruction has correct programId', () => {
    const ix = createCreateDaoInstruction(
      authority, dao, governanceToken, treasury,
      'TestDAO', 432000n, 10, 66, 86400n, 100n, 0, false, false
    )
    expect(ix.programId.toBase58()).toBe(GOVERNANCE_PROGRAM_ID.toBase58())
  })

  test('createCreateDaoInstruction has 6 accounts', () => {
    const ix = createCreateDaoInstruction(
      authority, dao, governanceToken, treasury,
      'TestDAO', 432000n, 10, 66, 86400n, 100n, 0, false, false
    )
    expect(ix.keys.length).toBe(6)
    expect(ix.keys[0].isSigner).toBe(true)
    expect(ix.keys[0].isWritable).toBe(true)
  })

  test('createUpdateDaoConfigInstruction has correct programId and 2 accounts', () => {
    const ix = createUpdateDaoConfigInstruction(authority, dao, 432000n, null, null, null)
    expect(ix.programId.toBase58()).toBe(GOVERNANCE_PROGRAM_ID.toBase58())
    expect(ix.keys.length).toBe(2)
  })

  test('createSetDaoAuthorityInstruction has 3 accounts', () => {
    const ix = createSetDaoAuthorityInstruction(authority, dao, newAuthority)
    expect(ix.keys.length).toBe(3)
    expect(ix.data[0]).toBe(DISCRIMINATORS.setDaoAuthority[0])
  })
})

// ---------------------------------------------------------------------------
// Proposal Instructions
// ---------------------------------------------------------------------------

describe('Proposal instruction builders', () => {
  test('createCreateProposalInstruction has 4 accounts', () => {
    const ix = createCreateProposalInstruction(
      authority, dao, proposal, 'Title', 'Description', 1
    )
    expect(ix.keys.length).toBe(4)
    expect(ix.programId.toBase58()).toBe(GOVERNANCE_PROGRAM_ID.toBase58())
    expect(ix.keys[0].isSigner).toBe(true)
  })

  test('createCancelProposalInstruction has correct discriminator', () => {
    const ix = createCancelProposalInstruction(authority, dao, proposal)
    expect(ix.keys.length).toBe(3)
    expect(ix.data[0]).toBe(DISCRIMINATORS.cancelProposal[0])
  })

  test('createExecuteProposalInstruction has 4 accounts', () => {
    const ix = createExecuteProposalInstruction(authority, dao, proposal, treasury)
    expect(ix.keys.length).toBe(4)
    expect(ix.data[0]).toBe(DISCRIMINATORS.executeProposal[0])
  })
})

// ---------------------------------------------------------------------------
// Voting Instructions
// ---------------------------------------------------------------------------

describe('Voting instruction builders', () => {
  test('createCastVoteInstruction has 6 accounts', () => {
    const ix = createCastVoteInstruction(voter, proposal, voteRecord, dao, governanceToken, 0)
    expect(ix.keys.length).toBe(6)
    expect(ix.keys[0].isSigner).toBe(true)
    expect(ix.data[0]).toBe(DISCRIMINATORS.castVote[0])
    expect(ix.data[8]).toBe(0) // vote type
  })

  test('createChangeVoteInstruction has 4 accounts', () => {
    const ix = createChangeVoteInstruction(voter, proposal, voteRecord, dao, 1)
    expect(ix.keys.length).toBe(4)
    expect(ix.data[0]).toBe(DISCRIMINATORS.changeVote[0])
    expect(ix.data[8]).toBe(1) // new vote type
  })

  test('createWithdrawVoteInstruction has 4 accounts', () => {
    const ix = createWithdrawVoteInstruction(voter, proposal, voteRecord, dao)
    expect(ix.keys.length).toBe(4)
    expect(ix.data[0]).toBe(DISCRIMINATORS.withdrawVote[0])
  })
})

// ---------------------------------------------------------------------------
// Delegation Instructions
// ---------------------------------------------------------------------------

describe('Delegation instruction builders', () => {
  test('createDelegateVotesInstruction has 5 accounts', () => {
    const ix = createDelegateVotesInstruction(
      delegator, delegate, dao, delegationAccount, 1000n, null
    )
    expect(ix.keys.length).toBe(5)
    expect(ix.keys[0].isSigner).toBe(true)
    expect(ix.data[0]).toBe(DISCRIMINATORS.delegateVotes[0])
  })

  test('createUndelegateInstruction has 3 accounts', () => {
    const ix = createUndelegateInstruction(delegator, dao, delegationAccount)
    expect(ix.keys.length).toBe(3)
    expect(ix.data[0]).toBe(DISCRIMINATORS.undelegate[0])
  })

  test('createAcceptDelegationInstruction has 4 accounts', () => {
    const ix = createAcceptDelegationInstruction(delegate, delegator, dao, delegationAccount)
    expect(ix.keys.length).toBe(4)
    expect(ix.data[0]).toBe(DISCRIMINATORS.acceptDelegation[0])
  })
})

// ---------------------------------------------------------------------------
// Treasury Instructions
// ---------------------------------------------------------------------------

describe('Treasury instruction builders', () => {
  test('createCreateTreasuryInstruction has 4 accounts', () => {
    const ix = createCreateTreasuryInstruction(authority, dao, treasury)
    expect(ix.keys.length).toBe(4)
    expect(ix.data[0]).toBe(DISCRIMINATORS.createTreasury[0])
  })

  test('createDepositToTreasuryInstruction has 6 accounts', () => {
    const ix = createDepositToTreasuryInstruction(
      authority, dao, treasury, tokenAccount, recipientTokenAccount, 1000n
    )
    expect(ix.keys.length).toBe(6)
    expect(ix.data[0]).toBe(DISCRIMINATORS.depositToTreasury[0])
    expect(ix.data.readBigUInt64LE(8)).toBe(1000n)
  })

  test('createWithdrawFromTreasuryInstruction has 7 accounts', () => {
    const ix = createWithdrawFromTreasuryInstruction(
      authority, dao, proposal, treasury, tokenAccount, recipientTokenAccount, 500n
    )
    expect(ix.keys.length).toBe(7)
    expect(ix.data[0]).toBe(DISCRIMINATORS.withdrawFromTreasury[0])
    expect(ix.data.readBigUInt64LE(8)).toBe(500n)
  })
})

// ---------------------------------------------------------------------------
// All instructions have correct programId
// ---------------------------------------------------------------------------

describe('All instructions use GOVERNANCE_PROGRAM_ID', () => {
  const instructions = [
    createCreateDaoInstruction(authority, dao, governanceToken, treasury, 'DAO', 432000n, 10, 66, 86400n, 0n, 0, false, false),
    createUpdateDaoConfigInstruction(authority, dao, null, null, null, null),
    createSetDaoAuthorityInstruction(authority, dao, newAuthority),
    createCreateProposalInstruction(authority, dao, proposal, 'T', 'D', 1),
    createCancelProposalInstruction(authority, dao, proposal),
    createExecuteProposalInstruction(authority, dao, proposal, treasury),
    createCastVoteInstruction(voter, proposal, voteRecord, dao, governanceToken, 0),
    createChangeVoteInstruction(voter, proposal, voteRecord, dao, 1),
    createWithdrawVoteInstruction(voter, proposal, voteRecord, dao),
    createDelegateVotesInstruction(delegator, delegate, dao, delegationAccount, 1000n, null),
    createUndelegateInstruction(delegator, dao, delegationAccount),
    createAcceptDelegationInstruction(delegate, delegator, dao, delegationAccount),
    createCreateTreasuryInstruction(authority, dao, treasury),
    createDepositToTreasuryInstruction(authority, dao, treasury, tokenAccount, recipientTokenAccount, 100n),
    createWithdrawFromTreasuryInstruction(authority, dao, proposal, treasury, tokenAccount, recipientTokenAccount, 100n),
  ]

  test('all 15 instruction builders return correct programId', () => {
    expect(instructions.length).toBe(15)
    for (const ix of instructions) {
      expect(ix.programId.toBase58()).toBe(GOVERNANCE_PROGRAM_ID.toBase58())
    }
  })
})
