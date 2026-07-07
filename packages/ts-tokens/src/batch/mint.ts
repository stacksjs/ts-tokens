/**
 * Batch Mint Operations
 */

import type {
  Connection,
  TransactionInstruction} from '@solana/web3.js';
import {
  PublicKey
} from '@solana/web3.js'
import {
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import type {
  BatchMintOptions,
  BatchMintResult,
  BatchMintRecipient,
  BatchNFTMintOptions,
  BatchNFTMintResult,
  BatchNFTMintItem,
} from './types'

/**
 * Execute batch token minting
 *
 * NOTE: This function only receives the payer's and mint authority's
 * `PublicKey`s, not signing `Keypair`s, so it cannot sign or submit
 * transactions. Signing/submitting batches is intentionally not implemented
 * here. Use `prepareBatchMint` to build the instructions and sign/send them
 * with a wallet.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function batchMint(
  connection: Connection,
  payer: PublicKey,
  mintAuthority: PublicKey,
  options: BatchMintOptions
): Promise<BatchMintResult> {
  throw new Error(
    'batchMint is not implemented: it receives only payer and mintAuthority ' +
    'PublicKeys and cannot sign or send transactions. Build instructions with ' +
    'prepareBatchMint() and sign/send them with a Keypair wallet.'
  )
}

/**
 * Execute batch NFT minting
 *
 * NOTE: This function only receives the payer's `PublicKey`, not a signing
 * `Keypair`, and NFT creation additionally requires a fresh mint `Keypair`
 * per NFT to sign the mint-account creation. It cannot sign or submit
 * transactions, and fabricating mint addresses would return data that does
 * not correspond to any on-chain account. Minting NFT batches is intentionally
 * not implemented here.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function batchMintNFTs(
  connection: Connection,
  payer: PublicKey,
  options: BatchNFTMintOptions
): Promise<BatchNFTMintResult> {
  throw new Error(
    'batchMintNFTs is not implemented: it receives only a payer PublicKey and ' +
    'cannot sign or send transactions, and NFT creation requires a signing ' +
    'Keypair plus a fresh mint Keypair per NFT. Use a wallet-backed NFT mint ' +
    'flow instead of this placeholder.'
  )
}

/**
 * Prepare batch mint instructions
 */
export async function prepareBatchMint(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  recipients: BatchMintRecipient[]
): Promise<TransactionInstruction[]> {
  const instructions: TransactionInstruction[] = []

  for (const recipient of recipients) {
    const recipientPubkey = typeof recipient.address === 'string'
      ? new PublicKey(recipient.address)
      : recipient.address

    const destAta = await getAssociatedTokenAddress(mint, recipientPubkey)

    // Check if ATA exists
    const destAccount = await connection.getAccountInfo(destAta)
    if (!destAccount) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          payer,
          destAta,
          recipientPubkey,
          mint
        )
      )
    }

    instructions.push(
      createMintToInstruction(
        mint,
        destAta,
        mintAuthority,
        recipient.amount
      )
    )
  }

  return instructions
}

/**
 * Calculate total mint amount
 */
export function calculateTotalMintAmount(recipients: BatchMintRecipient[]): bigint {
  return recipients.reduce((sum, r) => sum + r.amount, 0n)
}

/**
 * Validate batch mint recipients
 */
export function validateBatchMintRecipients(
  recipients: BatchMintRecipient[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (recipients.length === 0) {
    errors.push('No recipients provided')
  }

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i]

    try {
      if (typeof r.address === 'string') {
        new PublicKey(r.address)
      }
    } catch {
      errors.push(`Invalid address at index ${i}`)
    }

    if (r.amount <= 0n) {
      errors.push(`Invalid amount at index ${i}: must be positive`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate batch NFT mint items
 */
export function validateBatchNFTItems(
  items: BatchNFTMintItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (items.length === 0) {
    errors.push('No items provided')
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    if (!item.name || item.name.length === 0) {
      errors.push(`Missing name at index ${i}`)
    }

    if (item.name && item.name.length > 32) {
      errors.push(`Name too long at index ${i}: max 32 characters`)
    }

    if (!item.symbol || item.symbol.length === 0) {
      errors.push(`Missing symbol at index ${i}`)
    }

    if (item.symbol && item.symbol.length > 10) {
      errors.push(`Symbol too long at index ${i}: max 10 characters`)
    }

    if (!item.uri || item.uri.length === 0) {
      errors.push(`Missing URI at index ${i}`)
    }

    if (item.recipient) {
      try {
        if (typeof item.recipient === 'string') {
          new PublicKey(item.recipient)
        }
      } catch {
        errors.push(`Invalid recipient address at index ${i}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
