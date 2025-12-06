/**
 * Token Transfers
 *
 * Transfer tokens between addresses.
 */

import type { TokenConfig, TransactionResult, TransferOptions } from '../types'
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
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
 * Transfer tokens to an address
 *
 * @param options - Transfer options
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function transferTokens(
  options: TransferOptions,
  config: TokenConfig,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mint = new PublicKey(options.mint)
  const from = new PublicKey(options.from)
  const to = new PublicKey(options.to)
  const amount = BigInt(options.amount)

  // Determine program ID
  const mintInfo = await getMint(connection, mint)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Get source token account (ATA of from address)
  const sourceAta = await getAssociatedTokenAddress(mint, from, false, programId)

  // Get destination token account (ATA of to address)
  const destAta = await getAssociatedTokenAddress(mint, to, false, programId)

  const instructions = []

  // Check if destination ATA exists
  try {
    await getAccount(connection, destAta, undefined, programId)
  }
  catch {
    // Create destination ATA
    if (config.autoCreateAccounts) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          destAta,
          to,
          mint,
          programId,
        ),
      )
    }
    else {
      throw new Error(
        `Destination token account ${destAta.toBase58()} does not exist. `
        + `Set autoCreateAccounts: true in config to create it automatically.`,
      )
    }
  }

  // Add transfer instruction (use checked for safety)
  instructions.push(
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      destAta,
      from, // Owner of source account
      amount,
      mintInfo.decimals,
      [],
      programId,
    ),
  )

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options.options,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options.options)
}

/**
 * Transfer tokens to multiple addresses in a single transaction
 *
 * @param mint - Token mint address
 * @param from - Source wallet address
 * @param recipients - Array of { address, amount }
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function transferTokensToMany(
  mint: string,
  from: string,
  recipients: Array<{ address: string, amount: bigint | number }>,
  config: TokenConfig,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const fromPubkey = new PublicKey(from)

  // Determine program ID
  const mintInfo = await getMint(connection, mintPubkey)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Get source ATA
  const sourceAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey, false, programId)

  const instructions = []

  for (const recipient of recipients) {
    const to = new PublicKey(recipient.address)
    const destAta = await getAssociatedTokenAddress(mintPubkey, to, false, programId)

    // Check if destination ATA exists
    try {
      await getAccount(connection, destAta, undefined, programId)
    }
    catch {
      // Create destination ATA
      instructions.push(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          destAta,
          to,
          mintPubkey,
          programId,
        ),
      )
    }

    // Add transfer instruction
    instructions.push(
      createTransferCheckedInstruction(
        sourceAta,
        mintPubkey,
        destAta,
        fromPubkey,
        BigInt(recipient.amount),
        mintInfo.decimals,
        [],
        programId,
      ),
    )
  }

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction)
}

/**
 * Simple transfer helper
 */
export async function transfer(
  mint: string,
  to: string,
  amount: bigint | number,
  config: TokenConfig,
): Promise<TransactionResult> {
  const payer = loadWallet(config)

  return transferTokens(
    {
      mint,
      from: payer.publicKey.toBase58(),
      to,
      amount,
    },
    config,
  )
}
