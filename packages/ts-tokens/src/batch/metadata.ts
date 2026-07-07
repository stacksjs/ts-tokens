/**
 * Batch Metadata Update Operations
 *
 * Efficiently update metadata for multiple NFTs/tokens in batches.
 */

import type { Connection, TransactionInstruction } from '@solana/web3.js'
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
import { deserializeMetadata } from '../programs/token-metadata/accounts'
import { updateMetadataAccountV2 } from '../programs/token-metadata/instructions'
import type { DataV2 } from '../programs/token-metadata/types'
import { mergeMetadataUpdates } from '../nft/metadata-merge'

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
 * Build a single metadata update instruction, merging the requested changes over
 * the supplied current on-chain DataV2 so untouched fields are preserved.
 *
 * `current` must be the mint's current DataV2 (from `deserializeMetadata`) unless
 * the update only toggles primarySaleHappened/isMutable — UpdateMetadataAccountV2
 * replaces the whole DataV2 struct, so building a data change without the current
 * values would blank every field the caller did not set.
 */
export function buildMetadataUpdateInstruction(
  mint: string,
  updates: BatchMetadataUpdateItem['updates'],
  updateAuthority: PublicKey,
  current?: DataV2,
): TransactionInstruction {
  const mintPubkey = new PublicKey(mint)
  const metadataAddress = getMetadataAddress(mintPubkey)

  const touchesData =
    updates.name !== undefined ||
    updates.symbol !== undefined ||
    updates.uri !== undefined ||
    updates.sellerFeeBasisPoints !== undefined ||
    updates.creators !== undefined

  if (touchesData && !current) {
    throw new Error(
      `Updating metadata fields for ${mint} requires the current on-chain DataV2 ` +
      `to merge against (otherwise omitted fields would be wiped). Use ` +
      `buildMetadataUpdateInstructionForMint or pass the current DataV2.`
    )
  }

  const merged = current
    ? mergeMetadataUpdates(current, updates)
    : { data: undefined, changed: false }

  return updateMetadataAccountV2({
    metadata: metadataAddress,
    updateAuthority,
    data: merged.changed ? (merged.data as DataV2) : null,
    newUpdateAuthority: null,
    primarySaleHappened:
      updates.primarySaleHappened !== undefined ? updates.primarySaleHappened : null,
    isMutable: updates.isMutable !== undefined ? updates.isMutable : null,
  })
}

/**
 * Fetch a mint's current metadata and build a merge-preserving update instruction.
 */
export async function buildMetadataUpdateInstructionForMint(
  connection: Connection,
  mint: string,
  updates: BatchMetadataUpdateItem['updates'],
  updateAuthority: PublicKey,
): Promise<TransactionInstruction> {
  const metadataAddress = getMetadataAddress(new PublicKey(mint))
  const accountInfo = await connection.getAccountInfo(metadataAddress)
  if (!accountInfo) {
    throw new Error(`Metadata account not found for mint ${mint}`)
  }
  const current = deserializeMetadata(accountInfo.data)
  return buildMetadataUpdateInstruction(mint, updates, updateAuthority, current.data)
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
 * Prepare batch metadata update instructions without sending.
 *
 * Fetches each mint's current on-chain metadata so the built instructions merge
 * (rather than wipe) untouched fields.
 */
export async function prepareBatchMetadataUpdate(
  connection: Connection,
  items: BatchMetadataUpdateItem[],
  updateAuthority: PublicKey,
): Promise<{ instructions: TransactionInstruction[]; errors: Array<{ mint: string; error: string }> }> {
  const instructions: TransactionInstruction[] = []
  const errors: Array<{ mint: string; error: string }> = []

  for (const item of items) {
    const validationError = validateBatchMetadataItem(item)
    if (validationError) {
      errors.push({ mint: item.mint, error: validationError })
      continue
    }

    try {
      instructions.push(
        await buildMetadataUpdateInstructionForMint(
          connection,
          item.mint,
          item.updates,
          updateAuthority,
        )
      )
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
        const instruction = await buildMetadataUpdateInstructionForMint(
          connection,
          item.mint,
          item.updates,
          payer.publicKey,
        )

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
