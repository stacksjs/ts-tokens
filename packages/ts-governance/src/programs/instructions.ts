/**
 * Governance Instruction Builders
 *
 * Raw TransactionInstruction builders for all governance program operations.
 */

import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  GOVERNANCE_PROGRAM_ID,
  DISCRIMINATORS,
  serializeCreateDaoData,
  serializeUpdateDaoConfigData,
  serializeSetDaoAuthorityData,
  serializeCreateProposalData,
  serializeCastVoteData,
  serializeChangeVoteData,
  serializeDelegateVotesData,
  serializeDepositToTreasuryData,
  serializeWithdrawFromTreasuryData,
} from './program'

const SYSVAR_RENT = new PublicKey('SysvarRent111111111111111111111111111111111')

// ---------------------------------------------------------------------------
// DAO Instructions (3)
// ---------------------------------------------------------------------------

export function createCreateDaoInstruction(
  authority: PublicKey,
  dao: PublicKey,
  governanceToken: PublicKey,
  treasury: PublicKey,
  name: string,
  votingPeriod: bigint,
  quorum: number,
  approvalThreshold: number,
  executionDelay: bigint,
  minProposalThreshold: bigint,
  voteWeightType: number,
  allowEarlyExecution: boolean,
  allowVoteChange: boolean
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: dao, isSigner: false, isWritable: true },
      { pubkey: governanceToken, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: serializeCreateDaoData(
      name, votingPeriod, quorum, approvalThreshold,
      executionDelay, minProposalThreshold, voteWeightType,
      allowEarlyExecution, allowVoteChange
    ),
  }
}

export function createUpdateDaoConfigInstruction(
  authority: PublicKey,
  dao: PublicKey,
  votingPeriod: bigint | null,
  quorum: number | null,
  approvalThreshold: number | null,
  executionDelay: bigint | null
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: dao, isSigner: false, isWritable: true },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: serializeUpdateDaoConfigData(votingPeriod, quorum, approvalThreshold, executionDelay),
  }
}

export function createSetDaoAuthorityInstruction(
  authority: PublicKey,
  dao: PublicKey,
  newAuthority: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: dao, isSigner: false, isWritable: true },
      { pubkey: newAuthority, isSigner: false, isWritable: false },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: serializeSetDaoAuthorityData(newAuthority),
  }
}

// ---------------------------------------------------------------------------
// Proposal Instructions (3)
// ---------------------------------------------------------------------------

export function createCreateProposalInstruction(
  proposer: PublicKey,
  dao: PublicKey,
  proposal: PublicKey,
  title: string,
  description: string,
  actionsCount: number
): TransactionInstruction {
  return {
    keys: [
      { pubkey: proposer, isSigner: true, isWritable: true },
      { pubkey: dao, isSigner: false, isWritable: true },
      { pubkey: proposal, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: serializeCreateProposalData(title, description, actionsCount),
  }
}

export function createCancelProposalInstruction(
  authority: PublicKey,
  dao: PublicKey,
  proposal: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: dao, isSigner: false, isWritable: false },
      { pubkey: proposal, isSigner: false, isWritable: true },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.cancelProposal),
  }
}

export function createExecuteProposalInstruction(
  executor: PublicKey,
  dao: PublicKey,
  proposal: PublicKey,
  treasury: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: executor, isSigner: true, isWritable: true },
      { pubkey: dao, isSigner: false, isWritable: true },
      { pubkey: proposal, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.executeProposal),
  }
}

// ---------------------------------------------------------------------------
// Voting Instructions (3)
// ---------------------------------------------------------------------------

export function createCastVoteInstruction(
  voter: PublicKey,
  proposal: PublicKey,
  voteRecord: PublicKey,
  dao: PublicKey,
  governanceToken: PublicKey,
  voteType: number
): TransactionInstruction {
  return {
    keys: [
      { pubkey: voter, isSigner: true, isWritable: true },
      { pubkey: proposal, isSigner: false, isWritable: true },
      { pubkey: voteRecord, isSigner: false, isWritable: true },
      { pubkey: dao, isSigner: false, isWritable: false },
      { pubkey: governanceToken, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: serializeCastVoteData(voteType),
  }
}

export function createChangeVoteInstruction(
  voter: PublicKey,
  proposal: PublicKey,
  voteRecord: PublicKey,
  dao: PublicKey,
  newVoteType: number
): TransactionInstruction {
  return {
    keys: [
      { pubkey: voter, isSigner: true, isWritable: false },
      { pubkey: proposal, isSigner: false, isWritable: true },
      { pubkey: voteRecord, isSigner: false, isWritable: true },
      { pubkey: dao, isSigner: false, isWritable: false },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: serializeChangeVoteData(newVoteType),
  }
}

export function createWithdrawVoteInstruction(
  voter: PublicKey,
  proposal: PublicKey,
  voteRecord: PublicKey,
  dao: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: voter, isSigner: true, isWritable: true },
      { pubkey: proposal, isSigner: false, isWritable: true },
      { pubkey: voteRecord, isSigner: false, isWritable: true },
      { pubkey: dao, isSigner: false, isWritable: false },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.withdrawVote),
  }
}

// ---------------------------------------------------------------------------
// Delegation Instructions (3)
// ---------------------------------------------------------------------------

export function createDelegateVotesInstruction(
  delegator: PublicKey,
  delegate: PublicKey,
  dao: PublicKey,
  delegationAccount: PublicKey,
  amount: bigint,
  expiresAt: bigint | null
): TransactionInstruction {
  return {
    keys: [
      { pubkey: delegator, isSigner: true, isWritable: true },
      { pubkey: delegate, isSigner: false, isWritable: false },
      { pubkey: dao, isSigner: false, isWritable: false },
      { pubkey: delegationAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: serializeDelegateVotesData(amount, expiresAt),
  }
}

export function createUndelegateInstruction(
  delegator: PublicKey,
  dao: PublicKey,
  delegationAccount: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: delegator, isSigner: true, isWritable: true },
      { pubkey: dao, isSigner: false, isWritable: false },
      { pubkey: delegationAccount, isSigner: false, isWritable: true },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.undelegate),
  }
}

export function createAcceptDelegationInstruction(
  delegate: PublicKey,
  delegator: PublicKey,
  dao: PublicKey,
  delegationAccount: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: delegate, isSigner: true, isWritable: false },
      { pubkey: delegator, isSigner: false, isWritable: false },
      { pubkey: dao, isSigner: false, isWritable: false },
      { pubkey: delegationAccount, isSigner: false, isWritable: true },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.acceptDelegation),
  }
}

// ---------------------------------------------------------------------------
// Treasury Instructions (3)
// ---------------------------------------------------------------------------

export function createCreateTreasuryInstruction(
  authority: PublicKey,
  dao: PublicKey,
  treasury: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: dao, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.createTreasury),
  }
}

export function createDepositToTreasuryInstruction(
  depositor: PublicKey,
  dao: PublicKey,
  treasury: PublicKey,
  depositorTokenAccount: PublicKey,
  treasuryTokenAccount: PublicKey,
  amount: bigint
): TransactionInstruction {
  return {
    keys: [
      { pubkey: depositor, isSigner: true, isWritable: true },
      { pubkey: dao, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: depositorTokenAccount, isSigner: false, isWritable: true },
      { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: serializeDepositToTreasuryData(amount),
  }
}

export function createWithdrawFromTreasuryInstruction(
  authority: PublicKey,
  dao: PublicKey,
  proposal: PublicKey,
  treasury: PublicKey,
  treasuryTokenAccount: PublicKey,
  recipientTokenAccount: PublicKey,
  amount: bigint
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: dao, isSigner: false, isWritable: false },
      { pubkey: proposal, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
      { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: GOVERNANCE_PROGRAM_ID,
    data: serializeWithdrawFromTreasuryData(amount),
  }
}
