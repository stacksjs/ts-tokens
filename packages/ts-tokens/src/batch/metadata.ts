/**
 * Batch Metadata Update Operations
 *
 * Efficiently update metadata for multiple NFTs/tokens in batches.
 */

import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import type {
  BatchMetadataUpdateItem,
  BatchMetadataUpdateOptions,
  BatchMetadataUpdateResult,
} from './types'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'

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
 * Serialize UpdateMetadataAccountV2 instruction data
 */
function serializeUpdateMetadataV2(
  updates: BatchMetadataUpdateItem['updates'],
  _updateAuthority: PublicKey,
): Buffer {
  const buffer = Buffer.alloc(512)
  let offset = 0

  // Discriminator for UpdateMetadataAccountV2
  buffer.writeUInt8(15, offset)
  offset += 1

  // Data option (Some)
  buffer.writeUInt8(1, offset)
  offset += 1

  // Name
  if (updates.name) {
    const nameBytes = Buffer.from(updates.name.slice(0, 32))
    buffer.writeUInt32LE(nameBytes.length, offset)
    offset += 4
    nameBytes.copy(buffer, offset)
    offset += nameBytes.length
  } else {
    buffer.writeUInt32LE(0, offset)
    offset += 4
  }

  // Symbol
  if (updates.symbol) {
    const symbolBytes = Buffer.from(updates.symbol.slice(0, 10))
    buffer.writeUInt32LE(symbolBytes.length, offset)
    offset += 4
    symbolBytes.copy(buffer, offset)
    offset += symbolBytes.length
  } else {
    buffer.writeUInt32LE(0, offset)
    offset += 4
  }

  // URI
  if (updates.uri) {
    const uriBytes = Buffer.from(updates.uri.slice(0, 200))
    buffer.writeUInt32LE(uriBytes.length, offset)
    offset += 4
    uriBytes.copy(buffer, offset)
    offset += uriBytes.length
  } else {
    buffer.writeUInt32LE(0, offset)
    offset += 4
  }

  // Seller fee basis points
  buffer.writeUInt16LE(updates.sellerFeeBasisPoints || 0, offset)
  offset += 2

  // Creators (None for now - simplified)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Collection (None)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Uses (None)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Update authority option (None - keep existing)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Primary sale happened option
  if (updates.primarySaleHappened !== undefined) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    buffer.writeUInt8(updates.primarySaleHappened ? 1 : 0, offset)
    offset += 1
  } else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  // Is mutable option
  if (updates.isMutable !== undefined) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    buffer.writeUInt8(updates.isMutable ? 1 : 0, offset)
    offset += 1
  } else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  return buffer.slice(0, offset)
}

/**
 * Build a single metadata update instruction
 */
export function buildMetadataUpdateInstruction(
  mint: string,
  updates: BatchMetadataUpdateItem['updates'],
  updateAuthority: PublicKey,
): TransactionInstruction {
  const mintPubkey = new PublicKey(mint)
  const metadataAddress = getMetadataAddress(mintPubkey)

  const data = serializeUpdateMetadataV2(updates, updateAuthority)

  return {
    keys: [
      { pubkey: metadataAddress, isSigner: false, isWritable: true },
      { pubkey: updateAuthority, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  }
}

/**
 * Validate a batch metadata update item
 */
export function validateBatchMetadataItem(item: BatchMetadataUpdateItem): string | null {
  // Validate mint address
  try {
    new PublicKey(item.mint)
  } catch {
    return `Invalid mint address: ${item.mint}`
  }

  // Ensure at least one update field is provided
  const { updates } = item
  const hasUpdate = updates.name !== undefined
    || updates.symbol !== undefined
    || updates.uri !== undefined
    || updates.sellerFeeBasisPoints !== undefined
    || updates.creators !== undefined
    || updates.primarySaleHappened !== undefined
    || updates.isMutable !== undefined

  if (!hasUpdate) {
    return `No update fields provided for mint: ${item.mint}`
  }

  return null
}

/**
 * Prepare batch metadata update instructions without sending
 */
export function prepareBatchMetadataUpdate(
  items: BatchMetadataUpdateItem[],
  updateAuthority: PublicKey,
): { instructions: TransactionInstruction[]; errors: Array<{ mint: string; error: string }> } {
  const instructions: TransactionInstruction[] = []
  const errors: Array<{ mint: string; error: string }> = []

  for (const item of items) {
    const validationError = validateBatchMetadataItem(item)
    if (validationError) {
      errors.push({ mint: item.mint, error: validationError })
      continue
    }

    try {
      instructions.push(buildMetadataUpdateInstruction(item.mint, item.updates, updateAuthority))
    } catch (error) {
      errors.push({
        mint: item.mint,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { instructions, errors }
}

/**
 * Execute batch metadata updates
 */
export async function batchMetadataUpdate(
  options: BatchMetadataUpdateOptions,
  config: TokenConfig,
): Promise<BatchMetadataUpdateResult> {
  const {
    items,
    batchSize = 5,
    delayMs = 500,
    onProgress,
    onError,
  } = options

  const connection = createConnection(config)
  const payer = loadWallet(config)

  const result: BatchMetadataUpdateResult = {
    successful: 0,
    failed: 0,
    total: items.length,
    signatures: [],
    errors: [],
  }

  // Validate all items first
  for (const item of items) {
    const validationError = validateBatchMetadataItem(item)
    if (validationError) {
      result.errors.push({ mint: item.mint, error: validationError })
      result.failed++
    }
  }

  // Filter to valid items only
  const validItems = items.filter(item => !result.errors.find(e => e.mint === item.mint))

  // Process in batches
  for (let i = 0; i < validItems.length; i += batchSize) {
    const batch = validItems.slice(i, i + batchSize)

    for (const item of batch) {
      try {
        const instruction = buildMetadataUpdateInstruction(item.mint, item.updates, payer.publicKey)

        const transaction = await buildTransaction(
          connection,
          [instruction],
          payer.publicKey,
        )

        transaction.partialSign(payer)
        const txResult = await sendAndConfirmTransaction(connection, transaction)

        if (txResult.confirmed) {
          result.successful++
          result.signatures.push(txResult.signature)
        } else {
          result.failed++
          result.errors.push({
            mint: item.mint,
            error: txResult.error || 'Transaction failed',
          })
          if (onError) {
            onError(new Error(txResult.error || 'Transaction failed'), item)
          }
        }
      } catch (error) {
        result.failed++
        const errorMessage = error instanceof Error ? error.message : String(error)
        result.errors.push({ mint: item.mint, error: errorMessage })
        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage), item)
        }
      }

      if (onProgress) {
        onProgress(result.successful + result.failed, result.total, item.mint)
      }
    }

    // Delay between batches
    if (i + batchSize < validItems.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return result
}
