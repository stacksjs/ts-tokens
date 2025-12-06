/**
 * NFT Burning
 *
 * Burn NFTs to remove them from circulation.
 */

import type { TransactionInstruction } from '@solana/web3.js'
import type { TokenConfig, TransactionOptions, TransactionResult } from '../types'
import {
  createBurnInstruction,
  createCloseAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { createConnection } from '../drivers/solana/connection'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'

/**
 * Token Metadata Program ID
 */
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Get metadata account PDA
 */
function getMetadataAddress(mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
  return address
}

/**
 * Get master edition PDA
 */
function getMasterEditionAddress(mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
  return address
}

/**
 * Burn an NFT
 *
 * This burns the token and closes the token account, reclaiming SOL.
 * Note: This does NOT close the metadata/edition accounts (requires additional instructions).
 */
export async function burnNFT(
  mint: string,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)

  // Get token account
  const ata = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

  // Verify ownership
  const accountInfo = await getAccount(connection, ata)
  if (accountInfo.amount !== 1n) {
    throw new Error('Token account does not contain the NFT')
  }

  const instructions: TransactionInstruction[] = []

  // 1. Burn the token
  instructions.push(
    createBurnInstruction(
      ata,
      mintPubkey,
      payer.publicKey,
      1n,
    ),
  )

  // 2. Close the token account to reclaim SOL
  instructions.push(
    createCloseAccountInstruction(
      ata,
      payer.publicKey,
      payer.publicKey,
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
 * Burn NFT with full cleanup (including metadata accounts)
 *
 * This burns the token and attempts to close all associated accounts.
 */
export async function burnNFTFull(
  mint: string,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const metadataAddress = getMetadataAddress(mintPubkey)
  const masterEditionAddress = getMasterEditionAddress(mintPubkey)

  // Get token account
  const ata = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

  const instructions: TransactionInstruction[] = []

  // 1. Burn the token
  instructions.push(
    createBurnInstruction(
      ata,
      mintPubkey,
      payer.publicKey,
      1n,
    ),
  )

  // 2. Close the token account
  instructions.push(
    createCloseAccountInstruction(
      ata,
      payer.publicKey,
      payer.publicKey,
    ),
  )

  // 3. Burn NFT instruction (closes metadata and edition)
  // BurnNft instruction discriminator: 29
  const burnNftData = Buffer.alloc(1)
  burnNftData.writeUInt8(29, 0)

  instructions.push({
    keys: [
      { pubkey: metadataAddress, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: mintPubkey, isSigner: false, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: masterEditionAddress, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: burnNftData,
  })

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
 * Burn multiple NFTs
 */
export async function burnNFTs(
  mints: string[],
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instructions: TransactionInstruction[] = []

  for (const mint of mints) {
    const mintPubkey = new PublicKey(mint)
    const ata = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

    // Burn
    instructions.push(
      createBurnInstruction(
        ata,
        mintPubkey,
        payer.publicKey,
        1n,
      ),
    )

    // Close account
    instructions.push(
      createCloseAccountInstruction(
        ata,
        payer.publicKey,
        payer.publicKey,
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
