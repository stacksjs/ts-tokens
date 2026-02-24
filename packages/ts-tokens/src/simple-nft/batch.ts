/**
 * Simple NFT Batch Operations
 *
 * Batch create, transfer, and update operations with progress callbacks.
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type {
  CreateSimpleNFTOptions,
  UpdateSimpleNFTOptions,
  BatchCreateOptions,
  BatchTransferOptions,
  SimpleNFTResult,
  BatchResult,
} from './types'
import type { TokenConfig } from '../types'

/**
 * Batch create simple NFTs
 *
 * Creates multiple NFTs sequentially with progress reporting.
 *
 * @param connection - Solana connection
 * @param payer - Payer public key
 * @param options - Batch creation options with items array and optional onProgress
 * @param config - ts-tokens configuration
 * @returns BatchResult with successful results and failures
 */
export async function batchCreateSimpleNFTs(
  connection: Connection,
  payer: PublicKey,
  options: BatchCreateOptions,
  config: TokenConfig
): Promise<BatchResult<SimpleNFTResult>> {
  const { createSimpleNFT } = await import('./create')

  const successful: SimpleNFTResult[] = []
  const failed: Array<{ index: number; error: string }> = []
  const total = options.items.length

  for (let i = 0; i < total; i++) {
    try {
      const result = await createSimpleNFT(connection, payer, options.items[i], config)
      successful.push(result)
    } catch (err) {
      failed.push({
        index: i,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    options.onProgress?.(i + 1, total)
  }

  return { successful, failed, total }
}

/**
 * Batch transfer simple NFTs
 *
 * Transfers multiple NFTs to the same recipient. Uses batched transactions
 * when possible, falls back to sequential transfers.
 *
 * @param connection - Solana connection
 * @param from - Current owner
 * @param options - Batch transfer options with mints array and to address
 * @param config - ts-tokens configuration
 * @returns BatchResult with transfer signatures
 */
export async function batchTransferSimpleNFTs(
  _connection: Connection,
  _from: PublicKey,
  options: BatchTransferOptions,
  config: TokenConfig
): Promise<BatchResult<{ mint: string; signature: string }>> {
  const { transferNFTs } = await import('../nft/transfer')

  const successful: Array<{ mint: string; signature: string }> = []
  const failed: Array<{ index: number; error: string }> = []
  const total = options.mints.length

  // Try batch transfer (single transaction for multiple NFTs)
  const chunkSize = 5 // Max NFTs per transaction to avoid size limits
  for (let i = 0; i < total; i += chunkSize) {
    const chunk = options.mints.slice(i, i + chunkSize)
    try {
      const result = await transferNFTs(chunk, options.to, config)
      for (const mint of chunk) {
        successful.push({ mint, signature: result.signature })
      }
    } catch {
      // Fall back to individual transfers
      for (let j = 0; j < chunk.length; j++) {
        try {
          const { transferNFT } = await import('../nft/transfer')
          const result = await transferNFT(chunk[j], options.to, config)
          successful.push({ mint: chunk[j], signature: result.signature })
        } catch (err) {
          failed.push({
            index: i + j,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    options.onProgress?.(Math.min(i + chunkSize, total), total)
  }

  return { successful, failed, total }
}

/**
 * Batch update simple NFTs
 *
 * Updates metadata for multiple NFTs sequentially.
 *
 * @param connection - Solana connection
 * @param authority - Update authority
 * @param items - Array of {mint, updates} pairs
 * @param config - ts-tokens configuration
 * @param onProgress - Optional progress callback
 * @returns BatchResult with update signatures
 */
export async function batchUpdateSimpleNFTs(
  connection: Connection,
  authority: PublicKey,
  items: Array<{ mint: PublicKey; updates: UpdateSimpleNFTOptions }>,
  config: TokenConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<BatchResult<{ mint: string; signature: string }>> {
  const { updateSimpleNFT } = await import('./create')

  const successful: Array<{ mint: string; signature: string }> = []
  const failed: Array<{ index: number; error: string }> = []
  const total = items.length

  for (let i = 0; i < total; i++) {
    const { mint, updates } = items[i]
    try {
      const signature = await updateSimpleNFT(connection, mint, authority, updates, config)
      successful.push({ mint: mint.toBase58(), signature })
    } catch (err) {
      failed.push({
        index: i,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    onProgress?.(i + 1, total)
  }

  return { successful, failed, total }
}
