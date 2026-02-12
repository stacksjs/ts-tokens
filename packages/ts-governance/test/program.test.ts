/**
 * Program Layer Tests
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import {
  GOVERNANCE_PROGRAM_ID,
  DISCRIMINATORS,
  getDAOAddress,
  getProposalAddress,
  getVoteRecordAddress,
  getDelegationAddress,
  getTreasuryAddress,
  serializeCreateDaoData,
  serializeUpdateDaoConfigData,
  serializeSetDaoAuthorityData,
  serializeCreateProposalData,
  serializeCastVoteData,
  serializeChangeVoteData,
  serializeDelegateVotesData,
  serializeDepositToTreasuryData,
  serializeWithdrawFromTreasuryData,
} from '../src/programs/program'

// ---------------------------------------------------------------------------
// Program constants
// ---------------------------------------------------------------------------

describe('Program constants', () => {
  test('GOVERNANCE_PROGRAM_ID is a valid PublicKey', () => {
    expect(GOVERNANCE_PROGRAM_ID).toBeInstanceOf(PublicKey)
    expect(GOVERNANCE_PROGRAM_ID.toBase58()).toBeTruthy()
  })

  test('discriminators are 8-byte buffers', () => {
    for (const [_name, disc] of Object.entries(DISCRIMINATORS)) {
      expect(disc).toBeInstanceOf(Buffer)
      expect(disc.length).toBe(8)
    }
  })

  test('all 15 discriminators exist', () => {
    expect(Object.keys(DISCRIMINATORS).length).toBe(15)
  })

  test('discriminators have unique first byte', () => {
    const firstBytes = Object.values(DISCRIMINATORS).map(d => d[0])
    const unique = new Set(firstBytes)
    expect(unique.size).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// PDA derivation
// ---------------------------------------------------------------------------

describe('PDA derivation', () => {
  const authority = Keypair.generate().publicKey
  const dao = Keypair.generate().publicKey
  const proposal = Keypair.generate().publicKey
  const voter = Keypair.generate().publicKey
  const delegator = Keypair.generate().publicKey

  test('getDAOAddress returns valid PublicKey', () => {
    const daoAddr = getDAOAddress(authority, 'TestDAO')
    expect(daoAddr).toBeInstanceOf(PublicKey)
  })

  test('getDAOAddress is deterministic', () => {
    const addr1 = getDAOAddress(authority, 'TestDAO')
    const addr2 = getDAOAddress(authority, 'TestDAO')
    expect(addr1.toBase58()).toBe(addr2.toBase58())
  })

  test('different names produce different DAO PDAs', () => {
    const addr1 = getDAOAddress(authority, 'DAO_A')
    const addr2 = getDAOAddress(authority, 'DAO_B')
    expect(addr1.toBase58()).not.toBe(addr2.toBase58())
  })

  test('different authorities produce different DAO PDAs', () => {
    const otherAuthority = Keypair.generate().publicKey
    const addr1 = getDAOAddress(authority, 'TestDAO')
    const addr2 = getDAOAddress(otherAuthority, 'TestDAO')
    expect(addr1.toBase58()).not.toBe(addr2.toBase58())
  })

  test('getProposalAddress returns valid PublicKey', () => {
    const proposalAddr = getProposalAddress(dao, 0n)
    expect(proposalAddr).toBeInstanceOf(PublicKey)
  })

  test('getProposalAddress is deterministic', () => {
    const addr1 = getProposalAddress(dao, 0n)
    const addr2 = getProposalAddress(dao, 0n)
    expect(addr1.toBase58()).toBe(addr2.toBase58())
  })

  test('different indices produce different proposal PDAs', () => {
    const addr1 = getProposalAddress(dao, 0n)
    const addr2 = getProposalAddress(dao, 1n)
    expect(addr1.toBase58()).not.toBe(addr2.toBase58())
  })

  test('getVoteRecordAddress returns valid PublicKey', () => {
    const voteAddr = getVoteRecordAddress(proposal, voter)
    expect(voteAddr).toBeInstanceOf(PublicKey)
  })

  test('getVoteRecordAddress is deterministic', () => {
    const addr1 = getVoteRecordAddress(proposal, voter)
    const addr2 = getVoteRecordAddress(proposal, voter)
    expect(addr1.toBase58()).toBe(addr2.toBase58())
  })

  test('getDelegationAddress returns valid PublicKey', () => {
    const delAddr = getDelegationAddress(dao, delegator)
    expect(delAddr).toBeInstanceOf(PublicKey)
  })

  test('getDelegationAddress is deterministic', () => {
    const addr1 = getDelegationAddress(dao, delegator)
    const addr2 = getDelegationAddress(dao, delegator)
    expect(addr1.toBase58()).toBe(addr2.toBase58())
  })

  test('getTreasuryAddress returns valid PublicKey', () => {
    const treasuryAddr = getTreasuryAddress(dao)
    expect(treasuryAddr).toBeInstanceOf(PublicKey)
  })

  test('getTreasuryAddress is deterministic', () => {
    const addr1 = getTreasuryAddress(dao)
    const addr2 = getTreasuryAddress(dao)
    expect(addr1.toBase58()).toBe(addr2.toBase58())
  })

  test('different DAOs produce different treasury PDAs', () => {
    const otherDao = Keypair.generate().publicKey
    const addr1 = getTreasuryAddress(dao)
    const addr2 = getTreasuryAddress(otherDao)
    expect(addr1.toBase58()).not.toBe(addr2.toBase58())
  })
})

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

describe('Serializers', () => {
  test('serializeCreateDaoData produces correct buffer', () => {
    const data = serializeCreateDaoData('TestDAO', 432000n, 10, 66, 86400n, 100n, 0, false, false)
    // disc(8) + nameLen(4) + name(7) + votingPeriod(8) + quorum(2)
    // + approvalThreshold(2) + executionDelay(8) + minProposalThreshold(8) + 3 bools
    expect(data.length).toBe(8 + 4 + 7 + 8 + 2 + 2 + 8 + 8 + 1 + 1 + 1)
    expect(data[0]).toBe(DISCRIMINATORS.createDao[0])
    expect(data.readUInt32LE(8)).toBe(7) // name length
  })

  test('serializeUpdateDaoConfigData with all null options', () => {
    const data = serializeUpdateDaoConfigData(null, null, null, null)
    // 8 (disc) + 4 * 1 (None bytes) = 12
    expect(data.length).toBe(12)
  })

  test('serializeUpdateDaoConfigData with some options set', () => {
    const data = serializeUpdateDaoConfigData(432000n, null, null, null)
    // 8 (disc) + (1+8) + 1 + 1 + 1 = 20
    expect(data.length).toBe(20)
  })

  test('serializeSetDaoAuthorityData produces correct buffer', () => {
    const authority = Keypair.generate().publicKey
    const data = serializeSetDaoAuthorityData(authority)
    expect(data.length).toBe(40)
    expect(data[0]).toBe(DISCRIMINATORS.setDaoAuthority[0])
  })

  test('serializeCreateProposalData produces correct buffer', () => {
    const data = serializeCreateProposalData('Title', 'Desc', 2)
    // disc(8) + titleLen(4) + title(5) + descLen(4) + desc(4) + actionsCount(4)
    expect(data.length).toBe(8 + 4 + 5 + 4 + 4 + 4)
    expect(data[0]).toBe(DISCRIMINATORS.createProposal[0])
    expect(data.readUInt32LE(8)).toBe(5) // title length
  })

  test('serializeCastVoteData produces correct buffer', () => {
    const data = serializeCastVoteData(0)
    expect(data.length).toBe(9)
    expect(data[0]).toBe(DISCRIMINATORS.castVote[0])
    expect(data[8]).toBe(0)
  })

  test('serializeChangeVoteData produces correct buffer', () => {
    const data = serializeChangeVoteData(1)
    expect(data.length).toBe(9)
    expect(data[0]).toBe(DISCRIMINATORS.changeVote[0])
    expect(data[8]).toBe(1)
  })

  test('serializeDelegateVotesData without expiry', () => {
    const data = serializeDelegateVotesData(1000n, null)
    expect(data.length).toBe(17) // 8+8+1
    expect(data[0]).toBe(DISCRIMINATORS.delegateVotes[0])
    expect(data.readBigUInt64LE(8)).toBe(1000n)
    expect(data[16]).toBe(0) // no expiry
  })

  test('serializeDelegateVotesData with expiry', () => {
    const data = serializeDelegateVotesData(1000n, 9999999n)
    expect(data.length).toBe(25) // 8+8+1+8
    expect(data[16]).toBe(1) // has expiry
    expect(data.readBigUInt64LE(17)).toBe(9999999n)
  })

  test('serializeDepositToTreasuryData produces correct buffer', () => {
    const data = serializeDepositToTreasuryData(5000n)
    expect(data.length).toBe(16)
    expect(data.readBigUInt64LE(8)).toBe(5000n)
  })

  test('serializeWithdrawFromTreasuryData produces correct buffer', () => {
    const data = serializeWithdrawFromTreasuryData(3000n)
    expect(data.length).toBe(16)
    expect(data.readBigUInt64LE(8)).toBe(3000n)
  })
})
