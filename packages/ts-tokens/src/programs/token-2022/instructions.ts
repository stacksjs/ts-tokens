/**
 * Token-2022 Instructions
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js'
import type { ExtensionType, AccountState } from './types'
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
 * Harvest withheld tokens from accounts to mint
 */
export function harvestWithheldTokensToMint(options: {
  mint: PublicKey
  sources: PublicKey[]
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
    ...options.sources.map(s => ({ pubkey: s, isSigner: false, isWritable: true })),
  ]

  const data = Buffer.alloc(2)
  data[0] = 26 // TransferFeeExtension instruction
  data[1] = 4  // HarvestWithheldTokensToMint sub-instruction

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Convert raw amount to UI amount (interest-bearing)
 */
export function amountToUiAmount(options: {
  mint: PublicKey
  amount: bigint
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: false },
  ]

  const data = Buffer.alloc(9)
  data[0] = 23 // AmountToUiAmount instruction
  data.writeBigUInt64LE(options.amount, 1)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Convert UI amount string to raw amount
 */
export function uiAmountToAmount(options: {
  mint: PublicKey
  uiAmount: string
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: false },
  ]

  const uiAmountBytes = Buffer.from(options.uiAmount, 'utf-8')
  const data = Buffer.alloc(1 + uiAmountBytes.length + 1) // opcode + string + null terminator
  data[0] = 24 // UiAmountToAmount instruction
  uiAmountBytes.copy(data, 1)
  data[1 + uiAmountBytes.length] = 0 // null terminator

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Update transfer hook program ID
 */
export function updateTransferHook(options: {
  mint: PublicKey
  authority: PublicKey
  newProgramId: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: true, isWritable: false },
  ]

  const data = Buffer.alloc(34)
  data[0] = 36 // TransferHook instruction
  data[1] = 1  // Update sub-instruction
  options.newProgramId.toBuffer().copy(data, 2)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Update metadata pointer address
 */
export function updateMetadataPointer(options: {
  mint: PublicKey
  authority: PublicKey
  newMetadataAddress: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: true, isWritable: false },
  ]

  const data = Buffer.alloc(34)
  data[0] = 39 // MetadataPointer instruction
  data[1] = 1  // Update sub-instruction
  options.newMetadataAddress.toBuffer().copy(data, 2)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Update default account state
 */
export function updateDefaultAccountState(options: {
  mint: PublicKey
  authority: PublicKey
  state: AccountState
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: true, isWritable: false },
  ]

  const data = Buffer.alloc(3)
  data[0] = 28 // DefaultAccountState instruction
  data[1] = 1  // Update sub-instruction
  data[2] = options.state

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize confidential transfer mint
 */
export function initializeConfidentialTransferMint(options: {
  mint: PublicKey
  authority?: PublicKey | null
  autoApproveNewAccounts?: boolean
  auditorElGamalPubkey?: Uint8Array
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(98)
  data[0] = 27 // ConfidentialTransferExtension instruction
  data[1] = 0  // InitializeMint sub-instruction

  // Authority (COption<Pubkey>)
  if (options.authority) {
    data[2] = 1
    options.authority.toBuffer().copy(data, 3)
  } else {
    data[2] = 0
  }

  // Auto-approve new accounts
  data[35] = options.autoApproveNewAccounts ? 1 : 0

  // Auditor ElGamal pubkey
  if (options.auditorElGamalPubkey) {
    options.auditorElGamalPubkey.slice(0, 64).forEach((b, i) => {
      data[36 + i] = b
    })
  }

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Configure confidential transfer account
 *
 * @throws Error - Requires client-side ElGamal encryption which is not yet implemented.
 * Use the @solana/spl-token SDK with confidential transfer support for full functionality.
 */
export function configureConfidentialTransferAccount(_options: {
  account: PublicKey
  mint: PublicKey
  authority: PublicKey
}): never {
  throw new Error(
    'configureConfidentialTransferAccount requires client-side ElGamal encryption and decryption keys. ' +
    'This operation needs the @solana/spl-token confidential transfer SDK extension. ' +
    'See: https://spl.solana.com/confidential-token'
  )
}

/**
 * Confidential transfer
 *
 * @throws Error - Requires client-side ElGamal encryption and zero-knowledge proofs.
 * Use the @solana/spl-token SDK with confidential transfer support for full functionality.
 */
export function confidentialTransfer(_options: {
  source: PublicKey
  destination: PublicKey
  mint: PublicKey
  authority: PublicKey
  amount: bigint
}): never {
  throw new Error(
    'confidentialTransfer requires client-side ElGamal encryption and zero-knowledge proofs. ' +
    'This operation needs the @solana/spl-token confidential transfer SDK extension. ' +
    'See: https://spl.solana.com/confidential-token'
  )
}

/**
 * Enable CPI guard on account
 */
export function enableCpiGuard(options: {
  account: PublicKey
  owner: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: options.account, isSigner: false, isWritable: true },
    { pubkey: options.owner, isSigner: true, isWritable: false },
  ]

  const data = Buffer.alloc(2)
  data[0] = 34 // CpiGuard instruction
  data[1] = 0  // Enable sub-instruction

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Disable CPI guard on account
 */
export function disableCpiGuard(options: {
  account: PublicKey
  owner: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: options.account, isSigner: false, isWritable: true },
    { pubkey: options.owner, isSigner: true, isWritable: false },
  ]

  const data = Buffer.alloc(2)
  data[0] = 34 // CpiGuard instruction
  data[1] = 1  // Disable sub-instruction

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize group pointer on mint
 */
export function initializeGroupPointer(options: {
  mint: PublicKey
  authority?: PublicKey | null
  groupAddress?: PublicKey | null
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(66)
  data[0] = 40 // InitializeGroupPointer instruction
  data[1] = 0  // Initialize sub-instruction

  if (options.authority) {
    options.authority.toBuffer().copy(data, 2)
  }

  if (options.groupAddress) {
    options.groupAddress.toBuffer().copy(data, 34)
  }

  return new TransactionInstruction({
    keys,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  })
}

/**
 * Initialize group member pointer on mint
 */
export function initializeGroupMemberPointer(options: {
  mint: PublicKey
  authority?: PublicKey | null
  memberAddress?: PublicKey | null
}): TransactionInstruction {
  const keys = [
    { pubkey: options.mint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(66)
  data[0] = 41 // InitializeGroupMemberPointer instruction
  data[1] = 0  // Initialize sub-instruction

  if (options.authority) {
    options.authority.toBuffer().copy(data, 2)
  }

  if (options.memberAddress) {
    options.memberAddress.toBuffer().copy(data, 34)
  }

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
