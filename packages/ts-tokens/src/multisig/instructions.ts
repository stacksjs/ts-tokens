/**
 * Multi-Sig Instruction Builders
 *
 * Raw TransactionInstruction builders for all multisig program operations.
 */

import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import {
  MULTISIG_PROGRAM_ID,
  serializeCreateMultisigData,
  serializeAddOwnerData,
  serializeRemoveOwnerData,
  serializeChangeThresholdData,
  serializeCreateTransactionData,
  DISCRIMINATORS,
} from './program'

// ---------------------------------------------------------------------------
// Setup Instructions (4)
// ---------------------------------------------------------------------------

export function createCreateMultisigInstruction(
  creator: PublicKey,
  multisig: PublicKey,
  owners: PublicKey[],
  threshold: number
): TransactionInstruction {
  // Append owner pubkeys to the base data
  const baseData = serializeCreateMultisigData(threshold, owners.length)
  const ownersData = Buffer.concat(owners.map(o => o.toBuffer()))
  const data = Buffer.concat([baseData, ownersData])

  return {
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: multisig, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: MULTISIG_PROGRAM_ID,
    data,
  }
}

export function createAddOwnerInstruction(
  multisig: PublicKey,
  owner: PublicKey,
  newOwner: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: multisig, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: MULTISIG_PROGRAM_ID,
    data: serializeAddOwnerData(newOwner),
  }
}

export function createRemoveOwnerInstruction(
  multisig: PublicKey,
  owner: PublicKey,
  ownerToRemove: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: multisig, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: MULTISIG_PROGRAM_ID,
    data: serializeRemoveOwnerData(ownerToRemove),
  }
}

export function createChangeThresholdInstruction(
  multisig: PublicKey,
  owner: PublicKey,
  newThreshold: number
): TransactionInstruction {
  return {
    keys: [
      { pubkey: multisig, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: MULTISIG_PROGRAM_ID,
    data: serializeChangeThresholdData(newThreshold),
  }
}

// ---------------------------------------------------------------------------
// Transaction Lifecycle Instructions (5)
// ---------------------------------------------------------------------------

export function createProposeTransactionInstruction(
  proposer: PublicKey,
  multisig: PublicKey,
  transaction: PublicKey,
  instructionData: Buffer,
  expiresAt?: bigint
): TransactionInstruction {
  return {
    keys: [
      { pubkey: proposer, isSigner: true, isWritable: true },
      { pubkey: multisig, isSigner: false, isWritable: true },
      { pubkey: transaction, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: MULTISIG_PROGRAM_ID,
    data: serializeCreateTransactionData(instructionData, expiresAt),
  }
}

export function createApproveTransactionInstruction(
  owner: PublicKey,
  multisig: PublicKey,
  transaction: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: multisig, isSigner: false, isWritable: false },
      { pubkey: transaction, isSigner: false, isWritable: true },
    ],
    programId: MULTISIG_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.approveTransaction),
  }
}

export function createRejectTransactionInstruction(
  owner: PublicKey,
  multisig: PublicKey,
  transaction: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: multisig, isSigner: false, isWritable: false },
      { pubkey: transaction, isSigner: false, isWritable: true },
    ],
    programId: MULTISIG_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.rejectTransaction),
  }
}

export function createExecuteTransactionInstruction(
  executor: PublicKey,
  multisig: PublicKey,
  transaction: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: executor, isSigner: true, isWritable: true },
      { pubkey: multisig, isSigner: false, isWritable: true },
      { pubkey: transaction, isSigner: false, isWritable: true },
    ],
    programId: MULTISIG_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.executeTransaction),
  }
}

export function createCancelTransactionInstruction(
  proposer: PublicKey,
  multisig: PublicKey,
  transaction: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: proposer, isSigner: true, isWritable: false },
      { pubkey: multisig, isSigner: false, isWritable: false },
      { pubkey: transaction, isSigner: false, isWritable: true },
    ],
    programId: MULTISIG_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.cancelTransaction),
  }
}
