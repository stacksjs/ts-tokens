/**
 * Token Account Management
 *
 * Manage token accounts (ATAs, creation, closing).
 */

import type { TokenAccountInfo, TokenConfig, TransactionResult } from '../types'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { createConnection } from '../drivers/solana/connection'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'

/**
 * Get or create an associated token account
 *
 * @param owner - Owner wallet address
 * @param mint - Token mint address
 * @param config - Token configuration
 * @returns Token account address and whether it was created
 */
export async function getOrCreateAssociatedTokenAccount(
  owner: string,
  mint: string,
  config: TokenConfig,
): Promise<{ address: string, created: boolean, signature?: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const ownerPubkey = new PublicKey(owner)
  const mintPubkey = new PublicKey(mint)

  // Determine program ID
  const mintInfo = await getMint(connection, mintPubkey)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Get ATA address
  const ata = await getAssociatedTokenAddress(
    mintPubkey,
    ownerPubkey,
    false,
    programId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  // Check if it exists
  try {
    await getAccount(connection, ata, undefined, programId)
    return { address: ata.toBase58(), created: false }
  }
  catch {
    // Create the account
    const instruction = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      ownerPubkey,
      mintPubkey,
      programId,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    const transaction = await buildTransaction(
      connection,
      [instruction],
      payer.publicKey,
    )

    transaction.partialSign(payer)

    const result = await sendAndConfirmTransaction(connection, transaction)

    return {
      address: ata.toBase58(),
      created: true,
      signature: result.signature,
    }
  }
}

/**
 * Create a new associated token account
 *
 * @param owner - Owner wallet address
 * @param mint - Token mint address
 * @param config - Token configuration
 * @returns Transaction result with account address
 */
export async function createTokenAccount(
  owner: string,
  mint: string,
  config: TokenConfig,
): Promise<TransactionResult & { address: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const ownerPubkey = new PublicKey(owner)
  const mintPubkey = new PublicKey(mint)

  // Determine program ID
  const mintInfo = await getMint(connection, mintPubkey)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Get ATA address
  const ata = await getAssociatedTokenAddress(
    mintPubkey,
    ownerPubkey,
    false,
    programId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  // Check if it already exists
  try {
    await getAccount(connection, ata, undefined, programId)
    throw new Error(`Token account ${ata.toBase58()} already exists`)
  }
  catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error
    }
    // Account doesn't exist, continue with creation
  }

  const instruction = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    ata,
    ownerPubkey,
    mintPubkey,
    programId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return {
    ...result,
    address: ata.toBase58(),
  }
}

/**
 * Close an empty token account and reclaim SOL
 *
 * @param account - Token account address to close
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function closeTokenAccount(
  account: string,
  config: TokenConfig,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const accountPubkey = new PublicKey(account)

  // Get account info to determine program and verify it's empty
  const accountInfo = await getAccount(connection, accountPubkey)

  if (accountInfo.amount > 0n) {
    throw new Error(
      `Cannot close account with balance. Current balance: ${accountInfo.amount}. `
      + `Transfer or burn tokens first.`,
    )
  }

  // Verify owner
  if (accountInfo.owner.toBase58() !== payer.publicKey.toBase58()) {
    throw new Error(
      `Current wallet is not the account owner. `
      + `Expected: ${accountInfo.owner.toBase58()}, Got: ${payer.publicKey.toBase58()}`,
    )
  }

  // Determine program ID from the account
  const mintInfo = await getMint(connection, accountInfo.mint)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  const instruction = createCloseAccountInstruction(
    accountPubkey,
    payer.publicKey, // Destination for reclaimed SOL
    payer.publicKey, // Owner
    [],
    programId,
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction)
}

/**
 * Get detailed token account information
 *
 * @param account - Token account address
 * @param config - Token configuration
 * @returns Token account info
 */
export async function getTokenAccountInfo(
  account: string,
  config: TokenConfig,
): Promise<TokenAccountInfo> {
  const connection = createConnection(config)
  const accountPubkey = new PublicKey(account)

  const accountInfo = await getAccount(connection, accountPubkey)

  return {
    address: account,
    mint: accountInfo.mint.toBase58(),
    owner: accountInfo.owner.toBase58(),
    balance: accountInfo.amount,
    delegate: accountInfo.delegate?.toBase58() ?? null,
    delegatedAmount: accountInfo.delegatedAmount,
    isFrozen: accountInfo.isFrozen,
    isNative: accountInfo.isNative,
    closeAuthority: accountInfo.closeAuthority?.toBase58() ?? null,
  }
}

/**
 * Get associated token account address (without creating)
 *
 * @param owner - Owner wallet address
 * @param mint - Token mint address
 * @param allowOwnerOffCurve - Allow owner to be off curve (for PDAs)
 * @returns Associated token account address
 */
export async function getAssociatedTokenAccountAddress(
  owner: string,
  mint: string,
  allowOwnerOffCurve: boolean = false,
): Promise<string> {
  const ownerPubkey = new PublicKey(owner)
  const mintPubkey = new PublicKey(mint)

  const ata = await getAssociatedTokenAddress(
    mintPubkey,
    ownerPubkey,
    allowOwnerOffCurve,
  )

  return ata.toBase58()
}

/**
 * Check if a token account exists
 *
 * @param account - Token account address
 * @param config - Token configuration
 * @returns True if account exists
 */
export async function tokenAccountExists(
  account: string,
  config: TokenConfig,
): Promise<boolean> {
  const connection = createConnection(config)
  const accountPubkey = new PublicKey(account)

  try {
    await getAccount(connection, accountPubkey)
    return true
  }
  catch {
    return false
  }
}
