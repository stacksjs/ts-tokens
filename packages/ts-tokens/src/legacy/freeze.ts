/**
 * Legacy Freeze/Thaw Facade
 *
 * Freeze and thaw NFT token accounts.
 */

import type { TokenConfig, TransactionResult, TransactionOptions } from '../types'
import type { ProgressCallback, BatchResult } from '../types/legacy'
import { executeBatch } from './batch'

/**
 * Freeze an NFT by looking up its ATA and calling freezeAccount
 */
export async function freezeNFT(
  mint: string,
  owner: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const { getAssociatedTokenAddress } = await import('@solana/spl-token')
  const { freezeAccount } = await import('../token/authority')

  const mintPubkey = new PublicKey(mint)
  const ownerPubkey = new PublicKey(owner)
  const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)

  return freezeAccount(mint, ata.toBase58(), config, options)
}

/**
 * Thaw (unfreeze) an NFT by looking up its ATA and calling thawAccount
 */
export async function thawNFT(
  mint: string,
  owner: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const { getAssociatedTokenAddress } = await import('@solana/spl-token')
  const { thawAccount } = await import('../token/authority')

  const mintPubkey = new PublicKey(mint)
  const ownerPubkey = new PublicKey(owner)
  const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)

  return thawAccount(mint, ata.toBase58(), config, options)
}

/**
 * Batch freeze multiple NFTs
 */
export async function batchFreezeNFTs(
  items: Array<{ mint: string; owner: string }>,
  config: TokenConfig,
  options?: {
    batchSize?: number
    delayMs?: number
    onProgress?: ProgressCallback
  }
): Promise<BatchResult<string>> {
  return executeBatch({
    items: items.map(i => `${i.mint}:${i.owner}`),
    processor: async (item) => {
      const [mint, owner] = item.split(':')
      const result = await freezeNFT(mint, owner, config)
      return result.signature
    },
    batchSize: options?.batchSize,
    delayMs: options?.delayMs,
    onProgress: options?.onProgress,
  })
}

/**
 * Batch thaw multiple NFTs
 */
export async function batchThawNFTs(
  items: Array<{ mint: string; owner: string }>,
  config: TokenConfig,
  options?: {
    batchSize?: number
    delayMs?: number
    onProgress?: ProgressCallback
  }
): Promise<BatchResult<string>> {
  return executeBatch({
    items: items.map(i => `${i.mint}:${i.owner}`),
    processor: async (item) => {
      const [mint, owner] = item.split(':')
      const result = await thawNFT(mint, owner, config)
      return result.signature
    },
    batchSize: options?.batchSize,
    delayMs: options?.delayMs,
    onProgress: options?.onProgress,
  })
}
