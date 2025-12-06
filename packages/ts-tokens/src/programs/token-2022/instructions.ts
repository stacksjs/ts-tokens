/**
 * Token-2022 Instructions
 */

import type { AccountState, ExtensionType } from './types'
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import { getMintSize } from './extensions'

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')

/**
 * Initialize a Token-2022 mint with extensions
 */
export function initializeMint2(options: {
  mint: PublicKey
  decimals: number
  mintAuthority: PublicKey
  freezeAuthority: PublicKey | null
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(67)
  data[0] = 20 // InitializeMint2 instruction
  data[1] = options.decimals
  options.mintAuthority.toBuffer().copy(data, 2)
  data[34] = options.freezeAuthority ? 1 : 0
  if (options.freezeAuthority) {
    options.freezeAuthority.toBuffer().copy(data, 35)
  }

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize transfer fee extension
 */
export function initializeTransferFeeConfig(options: {
  mint: PublicKey
  transferFeeConfigAuthority: PublicKey | null
  withdrawWithheldAuthority: PublicKey | null
  transferFeeBasisPoints: number
  maximumFee: bigint
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(99)
  data[0] = 26 // InitializeTransferFeeConfig instruction

  // Config authority
  data[1] = options.transferFeeConfigAuthority ? 1 : 0
  if (options.transferFeeConfigAuthority) {
    options.transferFeeConfigAuthority.toBuffer().copy(data, 2)
  }

  // Withdraw authority
  data[34] = options.withdrawWithheldAuthority ? 1 : 0
  if (options.withdrawWithheldAuthority) {
    options.withdrawWithheldAuthority.toBuffer().copy(data, 35)
  }

  // Fee basis points
  data.writeUInt16LE(options.transferFeeBasisPoints, 67)

  // Maximum fee
  data.writeBigUInt64LE(options.maximumFee, 69)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize interest-bearing extension
 */
export function initializeInterestBearingMint(options: {
  mint: PublicKey
  rateAuthority: PublicKey | null
  rate: number
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(36)
  data[0] = 33 // InitializeInterestBearingMint instruction

  data[1] = options.rateAuthority ? 1 : 0
  if (options.rateAuthority) {
    options.rateAuthority.toBuffer().copy(data, 2)
  }

  data.writeInt16LE(options.rate, 34)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize permanent delegate extension
 */
export function initializePermanentDelegate(options: {
  mint: PublicKey
  delegate: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(33)
  data[0] = 35 // InitializePermanentDelegate instruction
  options.delegate.toBuffer().copy(data, 1)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize transfer hook extension
 */
export function initializeTransferHook(options: {
  mint: PublicKey
  authority: PublicKey | null
  programId: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(66)
  data[0] = 36 // InitializeTransferHook instruction

  data[1] = options.authority ? 1 : 0
  if (options.authority) {
    options.authority.toBuffer().copy(data, 2)
  }

  options.programId.toBuffer().copy(data, 34)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize metadata pointer extension
 */
export function initializeMetadataPointer(options: {
  mint: PublicKey
  authority: PublicKey | null
  metadataAddress: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(66)
  data[0] = 39 // InitializeMetadataPointer instruction

  data[1] = options.authority ? 1 : 0
  if (options.authority) {
    options.authority.toBuffer().copy(data, 2)
  }

  options.metadataAddress.toBuffer().copy(data, 34)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize mint close authority extension
 */
export function initializeMintCloseAuthority(options: {
  mint: PublicKey
  closeAuthority: PublicKey | null
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(34)
  data[0] = 25 // InitializeMintCloseAuthority instruction

  data[1] = options.closeAuthority ? 1 : 0
  if (options.closeAuthority) {
    options.closeAuthority.toBuffer().copy(data, 2)
  }

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize default account state extension
 */
export function initializeDefaultAccountState(options: {
  mint: PublicKey
  state: AccountState
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(2)
  data[0] = 28 // InitializeDefaultAccountState instruction
  data[1] = options.state

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize non-transferable extension
 */
export function initializeNonTransferableMint(options: {
  mint: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(1)
  data[0] = 32 // InitializeNonTransferableMint instruction

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Update transfer fee
 */
export function setTransferFee(options: {
  mint: PublicKey
  authority: PublicKey
  transferFeeBasisPoints: number
  maximumFee: bigint
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: true, isWritable: false },
  ]

  const data = Buffer.alloc(11)
  data[0] = 27 // SetTransferFee instruction
  data.writeUInt16LE(options.transferFeeBasisPoints, 1)
  data.writeBigUInt64LE(options.maximumFee, 3)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Withdraw withheld tokens from accounts
 */
export function withdrawWithheldTokensFromAccounts(options: {
  mint: PublicKey
  destination: PublicKey
  authority: PublicKey
  sources: PublicKey[]
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: false },
    { pubkey: options.destination, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: true, isWritable: false },
    ...options.sources.map(s => ({ pubkey: s, isSigner: false, isWritable: true })),
  ]

  const data = Buffer.alloc(2)
  data[0] = 29 // WithdrawWithheldTokensFromAccounts instruction
  data[1] = options.sources.length

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Update interest rate
 */
export function updateRateInterestBearingMint(options: {
  mint: PublicKey
  rateAuthority: PublicKey
  rate: number
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
    { pubkey: options.rateAuthority, isSigner: true, isWritable: false },
  ]

  const data = Buffer.alloc(3)
  data[0] = 34 // UpdateRateInterestBearingMint instruction
  data.writeInt16LE(options.rate, 1)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Create Token-2022 mint account with extensions
 */
export function createMintAccountInstruction(options: {
  payer: PublicKey
  mint: PublicKey
  extensions: ExtensionType[]
  lamports: number
}): TransactionInstruction {
  const space = getMintSize(options.extensions)

  return SystemProgram.createAccount({
    fromPubkey: options.payer,
    newAccountPubkey: options.mint,
    lamports: options.lamports,
    space,
    programId: TOKEN_2022_PROGRAM_ID,
  })
}
