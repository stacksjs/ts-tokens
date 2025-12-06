/**
 * NFT Transfers
 *
 * Transfer NFTs between wallets.
 */

import type { TokenConfig, TransactionOptions, TransactionResult } from '../types'
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { createConnection } from '../drivers/solana/connection'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'

/**
 * Transfer an NFT to another wallet
 */
export async function transferNFT(
  mint: string,
  to: string,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const toPubkey = new PublicKey(to)

  // Get source ATA
  const sourceAta = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

  // Get or create destination ATA
  const destAta = await getAssociatedTokenAddress(mintPubkey, toPubkey)

  const instructions = []

  // Check if destination ATA exists
  try {
    await getAccount(connection, destAta)
  }
  catch {
    // Create destination ATA
    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destAta,
        toPubkey,
        mintPubkey,
      ),
    )
  }

  // Transfer the NFT (amount = 1)
  instructions.push(
    createTransferInstruction(
      sourceAta,
      destAta,
      payer.publicKey,
      1n,
    ),
  )

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}

/**
 * Transfer multiple NFTs to the same recipient
 */
export async function transferNFTs(
  mints: string[],
  to: string,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const toPubkey = new PublicKey(to)
  const instructions = []

  for (const mint of mints) {
    const mintPubkey = new PublicKey(mint)

    // Get source ATA
    const sourceAta = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

    // Get or create destination ATA
    const destAta = await getAssociatedTokenAddress(mintPubkey, toPubkey)

    // Check if destination ATA exists
    try {
      await getAccount(connection, destAta)
    }
    catch {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          destAta,
          toPubkey,
          mintPubkey,
        ),
      )
    }

    // Transfer
    instructions.push(
      createTransferInstruction(
        sourceAta,
        destAta,
        payer.publicKey,
        1n,
      ),
    )
  }

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}

/**
 * Transfer NFT from a specific wallet (requires authority)
 */
export async function transferNFTFrom(
  mint: string,
  from: string,
  to: string,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const fromPubkey = new PublicKey(from)
  const toPubkey = new PublicKey(to)

  // Get source ATA
  const sourceAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey)

  // Get or create destination ATA
  const destAta = await getAssociatedTokenAddress(mintPubkey, toPubkey)

  const instructions = []

  // Check if destination ATA exists
  try {
    await getAccount(connection, destAta)
  }
  catch {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destAta,
        toPubkey,
        mintPubkey,
      ),
    )
  }

  // Transfer (payer must be delegate or owner)
  instructions.push(
    createTransferInstruction(
      sourceAta,
      destAta,
      payer.publicKey, // Authority
      1n,
    ),
  )

  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}
