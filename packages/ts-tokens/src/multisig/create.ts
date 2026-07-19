/**
 * Multi-Signature Creation
 */

import type {
  Connection} from '@solana/web3.js';
import {
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction as web3SendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMultisigInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token'
import { getMintWithProgram } from '../token/program'
import type {
  MultisigAccount,
  CreateMultisigOptions,
  MultisigConfig,
  SetTokenAuthorityMultisigOptions,
  MultisigResult,
} from './types'
import type { TokenConfig, TransactionOptions } from '../types'

// Multisig account size: 1 + 1 + 1 + (32 * 11) = 355 bytes
const MULTISIG_SIZE = 355

/**
 * Create a new multi-sig account
 */
export async function createMultisig(
  connection: Connection,
  payer: Keypair,
  options: CreateMultisigOptions
): Promise<{ address: PublicKey; signature: string }> {
  const { signers, threshold } = options

  // Enforce the same rules validateMultisigConfig checks so the two never
  // disagree — notably the >= 2 signer minimum a real multisig requires. Run
  // the shared validator and throw on the first error.
  const errors = validateMultisigConfig(options)
  if (errors.length > 0) {
    throw new Error(errors[0])
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

  // Initialize multisig instruction (SPL Token InitializeMultisig)
  const initMultisigIx = createInitializeMultisigInstruction(
    multisigAccount.publicKey,
    signers,
    threshold,
    TOKEN_PROGRAM_ID
  )

  const transaction = new Transaction().add(createAccountIx, initMultisigIx)

  // The SPL Token program is deployed, so this is a real transaction: sign
  // with both the payer and the new multisig account and submit it.
  const signature = await web3SendAndConfirmTransaction(
    connection,
    transaction,
    [payer, multisigAccount]
  )

  return {
    address: multisigAccount.publicKey,
    signature,
  }
}

/**
 * Get multi-sig account info
 */
export async function getMultisig(
  connection: Connection,
  address: PublicKey
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
  signers: PublicKey[]
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
  address: PublicKey
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    return false
  }

  // Check if owned by a token program (classic SPL or Token-2022) and has
  // the correct size
  if (
    !accountInfo.owner.equals(TOKEN_PROGRAM_ID) &&
    !accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
  ) {
    return false
  }

  if (accountInfo.data.length !== MULTISIG_SIZE) {
    return false
  }

  // Check if initialized
  return accountInfo.data[2] === 1
}

/**
 * Transfer token mint or freeze authority to a multisig PDA
 */
export async function setTokenAuthorityMultisig(
  options: SetTokenAuthorityMultisigOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<MultisigResult> {
  const { createConnection } = await import('../drivers/solana/connection')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')

  const connection = createConnection(config)
  const payer = loadWallet(config)

  const { mint: mintInfo, programId } = await getMintWithProgram(connection, options.mint)

  const authorityType = options.authorityType === 'mint'
    ? AuthorityType.MintTokens
    : AuthorityType.FreezeAccount

  // Validate current authority
  const currentAuthority = options.authorityType === 'mint'
    ? mintInfo.mintAuthority
    : mintInfo.freezeAuthority

  if (!currentAuthority) {
    throw new Error(`${options.authorityType} authority has already been revoked`)
  }

  if (!currentAuthority.equals(payer.publicKey)) {
    throw new Error(
      `Current wallet is not the ${options.authorityType} authority. ` +
      `Expected: ${currentAuthority.toBase58()}, Got: ${payer.publicKey.toBase58()}`
    )
  }

  // Transferring a mint/freeze authority is IRREVERSIBLE once signed: if the
  // target is not actually an initialized multisig account, the authority is
  // handed to an arbitrary (possibly uncontrollable) address. Verify the
  // target is a real multisig before building the instruction.
  if (!(await isMultisig(connection, options.multisig))) {
    throw new Error(
      `Refusing to transfer ${options.authorityType} authority: ${options.multisig.toBase58()} ` +
      `is not an initialized SPL multisig account. Create the multisig first (createMultisig); ` +
      `this operation is irreversible on-chain.`
    )
  }

  const instruction = createSetAuthorityInstruction(
    options.mint,
    payer.publicKey,
    authorityType,
    options.multisig,
    [],
    programId
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    multisig: options.multisig.toBase58(),
  }
}
