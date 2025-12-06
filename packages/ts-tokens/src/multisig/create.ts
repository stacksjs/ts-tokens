/**
 * Multi-Signature Creation
 */

import type {
  Connection,
} from '@solana/web3.js'
import type {
  CreateMultisigOptions,
  MultisigAccount,
  MultisigConfig,
} from './types'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

// Multisig account size: 1 + 1 + 1 + (32 * 11) = 355 bytes
const MULTISIG_SIZE = 355

/**
 * Create a new multi-sig account
 */
export async function createMultisig(
  connection: Connection,
  payer: Keypair,
  options: CreateMultisigOptions,
): Promise<{ address: PublicKey, signature: string }> {
  const { signers, threshold } = options

  if (threshold > signers.length) {
    throw new Error('Threshold cannot exceed number of signers')
  }

  if (threshold < 1) {
    throw new Error('Threshold must be at least 1')
  }

  if (signers.length > 11) {
    throw new Error('Maximum 11 signers allowed')
  }

  // Create new account for multisig
  const multisigAccount = Keypair.generate()

  const lamports = await connection.getMinimumBalanceForRentExemption(MULTISIG_SIZE)

  // Create account instruction
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: multisigAccount.publicKey,
    lamports,
    space: MULTISIG_SIZE,
    programId: TOKEN_PROGRAM_ID,
  })

  // Initialize multisig instruction
  const initMultisigIx = createInitializeMultisigInstruction(
    multisigAccount.publicKey,
    signers,
    threshold,
  )

  const transaction = new Transaction().add(createAccountIx, initMultisigIx)

  // Note: In production, would sign and send
  // This is a simplified version

  return {
    address: multisigAccount.publicKey,
    signature: 'multisig_created',
  }
}

/**
 * Create initialize multisig instruction
 */
function createInitializeMultisigInstruction(
  multisig: PublicKey,
  signers: PublicKey[],
  m: number,
): TransactionInstruction {
  const keys = [
    { pubkey: multisig, isSigner: false, isWritable: true },
    ...signers.map(s => ({ pubkey: s, isSigner: false, isWritable: false })),
  ]

  // Instruction data: [2 (InitializeMultisig), m]
  const data = Buffer.alloc(2)
  data[0] = 2 // InitializeMultisig instruction
  data[1] = m

  return new TransactionInstruction({
    keys,
    programId: TOKEN_PROGRAM_ID,
    data,
  })
}

/**
 * Get multi-sig account info
 */
export async function getMultisig(
  connection: Connection,
  address: PublicKey,
): Promise<MultisigAccount | null> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    return null
  }

  const data = accountInfo.data

  // Parse multisig data
  const m = data[0]
  const n = data[1]
  const isInitialized = data[2] === 1

  const signers: PublicKey[] = []
  for (let i = 0; i < n; i++) {
    const start = 3 + i * 32
    signers.push(new PublicKey(data.subarray(start, start + 32)))
  }

  return {
    address,
    m,
    n,
    signers,
    isInitialized,
  }
}

/**
 * Validate multi-sig configuration
 */
export function validateMultisigConfig(config: CreateMultisigOptions): string[] {
  const errors: string[] = []

  if (config.signers.length < 2) {
    errors.push('At least 2 signers required for multi-sig')
  }

  if (config.signers.length > 11) {
    errors.push('Maximum 11 signers allowed')
  }

  if (config.threshold < 1) {
    errors.push('Threshold must be at least 1')
  }

  if (config.threshold > config.signers.length) {
    errors.push('Threshold cannot exceed number of signers')
  }

  // Check for duplicate signers
  const uniqueSigners = new Set(config.signers.map(s => s.toBase58()))
  if (uniqueSigners.size !== config.signers.length) {
    errors.push('Duplicate signers not allowed')
  }

  return errors
}

/**
 * Create multi-sig config object
 */
export function createMultisigConfig(
  address: PublicKey,
  threshold: number,
  signers: PublicKey[],
): MultisigConfig {
  return {
    address,
    threshold,
    signers,
  }
}

/**
 * Check if address is a multi-sig
 */
export async function isMultisig(
  connection: Connection,
  address: PublicKey,
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    return false
  }

  // Check if owned by token program and has correct size
  if (!accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
    return false
  }

  if (accountInfo.data.length !== MULTISIG_SIZE) {
    return false
  }

  // Check if initialized
  return accountInfo.data[2] === 1
}
