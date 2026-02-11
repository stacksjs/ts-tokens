/**
 * Multi-Sig Program Constants & PDA Helpers
 *
 * Program ID, PDA derivation, instruction discriminators, and data serializers.
 */

import { PublicKey } from '@solana/web3.js'

/**
 * Multi-sig program ID (placeholder — program deployment deferred)
 */
export const MULTISIG_PROGRAM_ID = new PublicKey('Msig111111111111111111111111111111111111111')

// ---------------------------------------------------------------------------
// PDA derivation
// ---------------------------------------------------------------------------

export function getMultisigAddress(creator: PublicKey, nonce: bigint): PublicKey {
  const nonceBuffer = Buffer.alloc(8)
  nonceBuffer.writeBigUInt64LE(nonce)
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('multisig'), creator.toBuffer(), nonceBuffer],
    MULTISIG_PROGRAM_ID
  )
  return address
}

export function getTransactionAddress(multisig: PublicKey, txIndex: bigint): PublicKey {
  const indexBuffer = Buffer.alloc(8)
  indexBuffer.writeBigUInt64LE(txIndex)
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('transaction'), multisig.toBuffer(), indexBuffer],
    MULTISIG_PROGRAM_ID
  )
  return address
}

// ---------------------------------------------------------------------------
// Instruction discriminators (8-byte constants, incremental)
// ---------------------------------------------------------------------------

export const DISCRIMINATORS = {
  createMultisig:       Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
  addOwner:             Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
  removeOwner:          Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]),
  changeThreshold:      Buffer.from([3, 0, 0, 0, 0, 0, 0, 0]),
  createTransaction:    Buffer.from([4, 0, 0, 0, 0, 0, 0, 0]),
  approveTransaction:   Buffer.from([5, 0, 0, 0, 0, 0, 0, 0]),
  rejectTransaction:    Buffer.from([6, 0, 0, 0, 0, 0, 0, 0]),
  executeTransaction:   Buffer.from([7, 0, 0, 0, 0, 0, 0, 0]),
  cancelTransaction:    Buffer.from([8, 0, 0, 0, 0, 0, 0, 0]),
} as const

// ---------------------------------------------------------------------------
// Data serializers
// ---------------------------------------------------------------------------

export function serializeCreateMultisigData(
  threshold: number,
  ownerCount: number
): Buffer {
  const buffer = Buffer.alloc(8 + 1 + 1)
  let offset = 0
  DISCRIMINATORS.createMultisig.copy(buffer, offset); offset += 8
  buffer.writeUInt8(threshold, offset); offset += 1
  buffer.writeUInt8(ownerCount, offset)
  return buffer
}

export function serializeAddOwnerData(newOwner: PublicKey): Buffer {
  const buffer = Buffer.alloc(8 + 32)
  let offset = 0
  DISCRIMINATORS.addOwner.copy(buffer, offset); offset += 8
  newOwner.toBuffer().copy(buffer, offset)
  return buffer
}

export function serializeRemoveOwnerData(ownerToRemove: PublicKey): Buffer {
  const buffer = Buffer.alloc(8 + 32)
  let offset = 0
  DISCRIMINATORS.removeOwner.copy(buffer, offset); offset += 8
  ownerToRemove.toBuffer().copy(buffer, offset)
  return buffer
}

export function serializeChangeThresholdData(newThreshold: number): Buffer {
  const buffer = Buffer.alloc(8 + 1)
  let offset = 0
  DISCRIMINATORS.changeThreshold.copy(buffer, offset); offset += 8
  buffer.writeUInt8(newThreshold, offset)
  return buffer
}

export function serializeCreateTransactionData(
  instructionData: Buffer,
  expiresAt?: bigint
): Buffer {
  const hasExpiry = expiresAt !== undefined
  const buffer = Buffer.alloc(8 + 4 + instructionData.length + 1 + (hasExpiry ? 8 : 0))
  let offset = 0
  DISCRIMINATORS.createTransaction.copy(buffer, offset); offset += 8
  buffer.writeUInt32LE(instructionData.length, offset); offset += 4
  instructionData.copy(buffer, offset); offset += instructionData.length
  if (hasExpiry) {
    buffer.writeUInt8(1, offset); offset += 1
    buffer.writeBigInt64LE(expiresAt!, offset)
  } else {
    buffer.writeUInt8(0, offset)
  }
  return buffer
}
