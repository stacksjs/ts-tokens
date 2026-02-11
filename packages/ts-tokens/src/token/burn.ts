/**
 * Token Burning
 *
 * Burn tokens to reduce supply.
 */

import { Connection, PublicKey } from '@solana/web3.js'
import {
  createBurnInstruction,
  createBurnCheckedInstruction,
  getAssociatedTokenAddress,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'
import type { TokenConfig, BurnOptions, TransactionResult } from '../types'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'

/**
 * Burn tokens from a token account, permanently reducing total supply.
 *
 * The burn authority must be the token account owner or a delegated authority.
 *
 * @param options - Burn options (mint, amount, optional owner/from)
 * @param config - ts-tokens configuration
 * @returns Transaction result with signature
 *
 * @example
 * ```ts
 * const result = await burnTokens({ mint: 'Abc...', amount: 100n }, config)
 * ```
 */
export async function burnTokens(
  options: BurnOptions,
  config: TokenConfig
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mint = new PublicKey(options.mint)
  const owner = options.owner
    ? new PublicKey(options.owner)
    : payer.publicKey
  const amount = BigInt(options.amount)

  // Determine program ID
  const mintInfo = await getMint(connection, mint)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Get token account to burn from
  let tokenAccount: PublicKey
  if (options.from) {
    tokenAccount = new PublicKey(options.from)
  } else {
    // Use associated token account
    tokenAccount = await getAssociatedTokenAddress(mint, owner, false, programId)
  }

  // Verify account exists and has sufficient balance
  const accountInfo = await getAccount(connection, tokenAccount, undefined, programId)
  if (accountInfo.amount < amount) {
    throw new Error(
      `Insufficient balance. Account has ${accountInfo.amount} but trying to burn ${amount}`
    )
  }

  // Build burn instruction (use checked for safety)
  const instruction = createBurnCheckedInstruction(
    tokenAccount,
    mint,
    owner,
    amount,
    mintInfo.decimals,
    [],
    programId
  )

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options.options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options.options)
}

/**
 * Burn all tokens from an account
 *
 * @param mint - Token mint address
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function burnAll(
  mint: string,
  config: TokenConfig
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)

  // Determine program ID
  const mintInfo = await getMint(connection, mintPubkey)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Get ATA
  const ata = await getAssociatedTokenAddress(mintPubkey, payer.publicKey, false, programId)

  // Get current balance
  const accountInfo = await getAccount(connection, ata, undefined, programId)
  const amount = accountInfo.amount

  if (amount === 0n) {
    throw new Error('No tokens to burn')
  }

  return burnTokens(
    {
      mint,
      amount,
    },
    config
  )
}

/**
 * Simple burn helper
 */
export async function burn(
  mint: string,
  amount: bigint | number,
  config: TokenConfig
): Promise<TransactionResult> {
  return burnTokens(
    {
      mint,
      amount,
    },
    config
  )
}
