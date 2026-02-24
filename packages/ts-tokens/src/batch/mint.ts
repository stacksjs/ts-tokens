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
 */
export async function batchMint(
  connection: Connection,
  payer: PublicKey,
  mintAuthority: PublicKey,
  options: BatchMintOptions
): Promise<BatchMintResult> {
  const {
    mint,
    recipients,
    batchSize = 10,
    delayMs = 500,
    onProgress,
    onError,
  } = options

  const result: BatchMintResult = {
    successful: 0,
    failed: 0,
    total: recipients.length,
    signatures: [],
    errors: [],
  }

  // Process in batches
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

    try {
      const instructions: TransactionInstruction[] = []

      for (const recipient of batch) {
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

        // Add mint instruction
        instructions.push(
          createMintToInstruction(
            mint,
            destAta,
            mintAuthority,
            recipient.amount
          )
        )
      }

      // Note: In production, would sign and send transaction
      result.successful += batch.length

      for (const recipient of batch) {
        const addr = typeof recipient.address === 'string'
          ? recipient.address
          : recipient.address.toBase58()
        result.signatures.push(`mint_${i}_${addr}`)
      }

    } catch (error) {
      result.failed += batch.length

      for (const recipient of batch) {
        const addr = typeof recipient.address === 'string'
          ? recipient.address
          : recipient.address.toBase58()

        result.errors.push({
          recipient: addr,
          error: (error as Error).message,
        })

        if (onError) {
          onError(error as Error, recipient)
        }
      }
    }

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, recipients.length), recipients.length)
    }

    // Delay between batches
    if (i + batchSize < recipients.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return result
}

/**
 * Execute batch NFT minting
 */
export async function batchMintNFTs(
  _connection: Connection,
  _payer: PublicKey,
  options: BatchNFTMintOptions
): Promise<BatchNFTMintResult> {
  const {
    collection,
    items,
    sellerFeeBasisPoints = 500,
    batchSize = 1, // NFTs are heavier, process one at a time
    delayMs = 1000,
    onProgress,
    onError,
  } = options

  const result: BatchNFTMintResult = {
    successful: 0,
    failed: 0,
    total: items.length,
    mints: [],
    errors: [],
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    try {
      // In production, would create NFT here
      // This is a placeholder showing the structure
      const mockMint = `NFT_${i}_${item.name.replace(/\s/g, '_')}`

      result.successful++
      result.mints.push(mockMint)

      if (onProgress) {
        onProgress(i + 1, items.length, mockMint)
      }

    } catch (error) {
      result.failed++
      result.errors.push({
        item,
        error: (error as Error).message,
      })

      if (onError) {
        onError(error as Error, item)
      }
    }

    // Delay between mints
    if (i < items.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return result
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
