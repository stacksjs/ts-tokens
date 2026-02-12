/**
 * Governance Program Constants & PDA Helpers
 *
 * Program ID, PDA derivation, instruction discriminators, and data serializers.
 */

import { PublicKey } from '@solana/web3.js'

/**
 * Governance program ID (placeholder — program deployment deferred)
 */
export const GOVERNANCE_PROGRAM_ID = new PublicKey('Gov1111111111111111111111111111111111111111')

// ---------------------------------------------------------------------------
// PDA derivation
// ---------------------------------------------------------------------------

export function getDAOAddress(authority: PublicKey, name: string): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('dao'), authority.toBuffer(), Buffer.from(name)],
    GOVERNANCE_PROGRAM_ID
  )
  return address
}

export function getProposalAddress(dao: PublicKey, index: bigint): PublicKey {
  const indexBuffer = Buffer.alloc(8)
  indexBuffer.writeBigUInt64LE(index)
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('proposal'), dao.toBuffer(), indexBuffer],
    GOVERNANCE_PROGRAM_ID
  )
  return address
}

export function getVoteRecordAddress(proposal: PublicKey, voter: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('vote'), proposal.toBuffer(), voter.toBuffer()],
    GOVERNANCE_PROGRAM_ID
  )
  return address
}

export function getDelegationAddress(dao: PublicKey, delegator: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('delegation'), dao.toBuffer(), delegator.toBuffer()],
    GOVERNANCE_PROGRAM_ID
  )
  return address
}

export function getTreasuryAddress(dao: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), dao.toBuffer()],
    GOVERNANCE_PROGRAM_ID
  )
  return address
}

// ---------------------------------------------------------------------------
// Instruction discriminators (8-byte constants, incremental)
// ---------------------------------------------------------------------------

export const DISCRIMINATORS = {
  createDao:            Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
  updateDaoConfig:      Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
  setDaoAuthority:      Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]),
  createProposal:       Buffer.from([3, 0, 0, 0, 0, 0, 0, 0]),
  cancelProposal:       Buffer.from([4, 0, 0, 0, 0, 0, 0, 0]),
  executeProposal:      Buffer.from([5, 0, 0, 0, 0, 0, 0, 0]),
  castVote:             Buffer.from([6, 0, 0, 0, 0, 0, 0, 0]),
  changeVote:           Buffer.from([7, 0, 0, 0, 0, 0, 0, 0]),
  withdrawVote:         Buffer.from([8, 0, 0, 0, 0, 0, 0, 0]),
  delegateVotes:        Buffer.from([9, 0, 0, 0, 0, 0, 0, 0]),
  undelegate:           Buffer.from([10, 0, 0, 0, 0, 0, 0, 0]),
  acceptDelegation:     Buffer.from([11, 0, 0, 0, 0, 0, 0, 0]),
  createTreasury:       Buffer.from([12, 0, 0, 0, 0, 0, 0, 0]),
  depositToTreasury:    Buffer.from([13, 0, 0, 0, 0, 0, 0, 0]),
  withdrawFromTreasury: Buffer.from([14, 0, 0, 0, 0, 0, 0, 0]),
} as const

// ---------------------------------------------------------------------------
// Data serializers
// ---------------------------------------------------------------------------

export function serializeCreateDaoData(
  name: string,
  votingPeriod: bigint,
  quorum: number,
  approvalThreshold: number,
  executionDelay: bigint,
  minProposalThreshold: bigint,
  voteWeightType: number,
  allowEarlyExecution: boolean,
  allowVoteChange: boolean
): Buffer {
  const nameBytes = Buffer.from(name)
  // disc(8) + nameLen(4) + name(var) + votingPeriod(8) + quorum(2)
  // + approvalThreshold(2) + executionDelay(8) + minProposalThreshold(8)
  // + voteWeightType(1) + allowEarlyExecution(1) + allowVoteChange(1)
  const buffer = Buffer.alloc(8 + 4 + nameBytes.length + 8 + 2 + 2 + 8 + 8 + 1 + 1 + 1)
  let offset = 0
  DISCRIMINATORS.createDao.copy(buffer, offset); offset += 8
  buffer.writeUInt32LE(nameBytes.length, offset); offset += 4
  nameBytes.copy(buffer, offset); offset += nameBytes.length
  buffer.writeBigUInt64LE(votingPeriod, offset); offset += 8
  buffer.writeUInt16LE(quorum, offset); offset += 2
  buffer.writeUInt16LE(approvalThreshold, offset); offset += 2
  buffer.writeBigUInt64LE(executionDelay, offset); offset += 8
  buffer.writeBigUInt64LE(minProposalThreshold, offset); offset += 8
  buffer.writeUInt8(voteWeightType, offset); offset += 1
  buffer.writeUInt8(allowEarlyExecution ? 1 : 0, offset); offset += 1
  buffer.writeUInt8(allowVoteChange ? 1 : 0, offset)
  return buffer
}

export function serializeUpdateDaoConfigData(
  votingPeriod: bigint | null,
  quorum: number | null,
  approvalThreshold: number | null,
  executionDelay: bigint | null
): Buffer {
  const buffer = Buffer.alloc(8 + (1 + 8) * 2 + (1 + 2) * 2)
  let offset = 0
  DISCRIMINATORS.updateDaoConfig.copy(buffer, offset); offset += 8

  if (votingPeriod !== null) {
    buffer.writeUInt8(1, offset); offset += 1
    buffer.writeBigUInt64LE(votingPeriod, offset); offset += 8
  } else {
    buffer.writeUInt8(0, offset); offset += 1
  }

  if (quorum !== null) {
    buffer.writeUInt8(1, offset); offset += 1
    buffer.writeUInt16LE(quorum, offset); offset += 2
  } else {
    buffer.writeUInt8(0, offset); offset += 1
  }

  if (approvalThreshold !== null) {
    buffer.writeUInt8(1, offset); offset += 1
    buffer.writeUInt16LE(approvalThreshold, offset); offset += 2
  } else {
    buffer.writeUInt8(0, offset); offset += 1
  }

  if (executionDelay !== null) {
    buffer.writeUInt8(1, offset); offset += 1
    buffer.writeBigUInt64LE(executionDelay, offset); offset += 8
  } else {
    buffer.writeUInt8(0, offset); offset += 1
  }

  return buffer.subarray(0, offset)
}

export function serializeSetDaoAuthorityData(newAuthority: PublicKey): Buffer {
  const buffer = Buffer.alloc(8 + 32)
  DISCRIMINATORS.setDaoAuthority.copy(buffer, 0)
  newAuthority.toBuffer().copy(buffer, 8)
  return buffer
}

export function serializeCreateProposalData(
  title: string,
  description: string,
  actionsCount: number
): Buffer {
  const titleBytes = Buffer.from(title)
  const descBytes = Buffer.from(description)
  const buffer = Buffer.alloc(8 + 4 + titleBytes.length + 4 + descBytes.length + 4)
  let offset = 0
  DISCRIMINATORS.createProposal.copy(buffer, offset); offset += 8
  buffer.writeUInt32LE(titleBytes.length, offset); offset += 4
  titleBytes.copy(buffer, offset); offset += titleBytes.length
  buffer.writeUInt32LE(descBytes.length, offset); offset += 4
  descBytes.copy(buffer, offset); offset += descBytes.length
  buffer.writeUInt32LE(actionsCount, offset)
  return buffer
}

export function serializeCastVoteData(voteType: number): Buffer {
  const buffer = Buffer.alloc(8 + 1)
  DISCRIMINATORS.castVote.copy(buffer, 0)
  buffer.writeUInt8(voteType, 8)
  return buffer
}

export function serializeChangeVoteData(newVoteType: number): Buffer {
  const buffer = Buffer.alloc(8 + 1)
  DISCRIMINATORS.changeVote.copy(buffer, 0)
  buffer.writeUInt8(newVoteType, 8)
  return buffer
}

export function serializeDelegateVotesData(amount: bigint, expiresAt: bigint | null): Buffer {
  const hasExpiry = expiresAt !== null
  const buffer = Buffer.alloc(8 + 8 + 1 + (hasExpiry ? 8 : 0))
  let offset = 0
  DISCRIMINATORS.delegateVotes.copy(buffer, offset); offset += 8
  buffer.writeBigUInt64LE(amount, offset); offset += 8
  if (hasExpiry) {
    buffer.writeUInt8(1, offset); offset += 1
    buffer.writeBigUInt64LE(expiresAt!, offset)
  } else {
    buffer.writeUInt8(0, offset)
  }
  return buffer
}

export function serializeDepositToTreasuryData(amount: bigint): Buffer {
  const buffer = Buffer.alloc(8 + 8)
  DISCRIMINATORS.depositToTreasury.copy(buffer, 0)
  buffer.writeBigUInt64LE(amount, 8)
  return buffer
}

export function serializeWithdrawFromTreasuryData(amount: bigint): Buffer {
  const buffer = Buffer.alloc(8 + 8)
  DISCRIMINATORS.withdrawFromTreasury.copy(buffer, 0)
  buffer.writeBigUInt64LE(amount, 8)
  return buffer
}
