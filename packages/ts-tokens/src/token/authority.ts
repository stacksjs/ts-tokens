/**
 * Token Authority Management
 *
 * Manage mint, freeze, and other token authorities.
 */

import type { TokenConfig, TransactionOptions, TransactionResult } from '../types'
import {
  AuthorityType,
  createFreezeAccountInstruction,
  createSetAuthorityInstruction,
  createThawAccountInstruction,
  getAccount,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { createConnection } from '../drivers/solana/connection'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'

/**
 * Set mint authority for a token
 *
 * @param mint - Token mint address
 * @param newAuthority - New mint authority (null to revoke)
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function setMintAuthority(
  mint: string,
  newAuthority: string | null,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const newAuthorityPubkey = newAuthority ? new PublicKey(newAuthority) : null

  // Determine program ID
  const mintInfo = await getMint(connection, mintPubkey)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Current authority must be the payer
  if (!mintInfo.mintAuthority) {
    throw new Error('Mint authority has already been revoked')
  }

  if (mintInfo.mintAuthority.toBase58() !== payer.publicKey.toBase58()) {
    throw new Error(
      `Current wallet is not the mint authority. `
      + `Expected: ${mintInfo.mintAuthority.toBase58()}, Got: ${payer.publicKey.toBase58()}`,
    )
  }

  const instruction = createSetAuthorityInstruction(
    mintPubkey,
    payer.publicKey,
    AuthorityType.MintTokens,
    newAuthorityPubkey,
    [],
    programId,
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}

/**
 * Revoke mint authority (make token fixed supply)
 *
 * @param mint - Token mint address
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function revokeMintAuthority(
  mint: string,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  return setMintAuthority(mint, null, config, options)
}

/**
 * Set freeze authority for a token
 *
 * @param mint - Token mint address
 * @param newAuthority - New freeze authority (null to revoke)
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function setFreezeAuthority(
  mint: string,
  newAuthority: string | null,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const newAuthorityPubkey = newAuthority ? new PublicKey(newAuthority) : null

  // Determine program ID
  const mintInfo = await getMint(connection, mintPubkey)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Current authority must be the payer
  if (!mintInfo.freezeAuthority) {
    throw new Error('Freeze authority has already been revoked')
  }

  if (mintInfo.freezeAuthority.toBase58() !== payer.publicKey.toBase58()) {
    throw new Error(
      `Current wallet is not the freeze authority. `
      + `Expected: ${mintInfo.freezeAuthority.toBase58()}, Got: ${payer.publicKey.toBase58()}`,
    )
  }

  const instruction = createSetAuthorityInstruction(
    mintPubkey,
    payer.publicKey,
    AuthorityType.FreezeAccount,
    newAuthorityPubkey,
    [],
    programId,
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}

/**
 * Revoke freeze authority
 *
 * @param mint - Token mint address
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function revokeFreezeAuthority(
  mint: string,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  return setFreezeAuthority(mint, null, config, options)
}

/**
 * Freeze a token account
 *
 * @param mint - Token mint address
 * @param account - Token account to freeze
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function freezeAccount(
  mint: string,
  account: string,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const accountPubkey = new PublicKey(account)

  // Determine program ID
  const mintInfo = await getMint(connection, mintPubkey)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Verify freeze authority
  if (!mintInfo.freezeAuthority) {
    throw new Error('Token does not have a freeze authority')
  }

  if (mintInfo.freezeAuthority.toBase58() !== payer.publicKey.toBase58()) {
    throw new Error(
      `Current wallet is not the freeze authority. `
      + `Expected: ${mintInfo.freezeAuthority.toBase58()}, Got: ${payer.publicKey.toBase58()}`,
    )
  }

  // Verify account exists and is not already frozen
  const accountInfo = await getAccount(connection, accountPubkey, undefined, programId)
  if (accountInfo.isFrozen) {
    throw new Error('Account is already frozen')
  }

  const instruction = createFreezeAccountInstruction(
    accountPubkey,
    mintPubkey,
    payer.publicKey,
    [],
    programId,
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}

/**
 * Thaw (unfreeze) a token account
 *
 * @param mint - Token mint address
 * @param account - Token account to thaw
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function thawAccount(
  mint: string,
  account: string,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const accountPubkey = new PublicKey(account)

  // Determine program ID
  const mintInfo = await getMint(connection, mintPubkey)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Verify freeze authority
  if (!mintInfo.freezeAuthority) {
    throw new Error('Token does not have a freeze authority')
  }

  if (mintInfo.freezeAuthority.toBase58() !== payer.publicKey.toBase58()) {
    throw new Error(
      `Current wallet is not the freeze authority. `
      + `Expected: ${mintInfo.freezeAuthority.toBase58()}, Got: ${payer.publicKey.toBase58()}`,
    )
  }

  // Verify account exists and is frozen
  const accountInfo = await getAccount(connection, accountPubkey, undefined, programId)
  if (!accountInfo.isFrozen) {
    throw new Error('Account is not frozen')
  }

  const instruction = createThawAccountInstruction(
    accountPubkey,
    mintPubkey,
    payer.publicKey,
    [],
    programId,
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}
