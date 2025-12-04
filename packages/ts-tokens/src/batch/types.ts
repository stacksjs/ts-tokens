/**
 * Batch Operation Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Batch transfer recipient
 */
export interface BatchTransferRecipient {
  address: string | PublicKey
  amount: bigint
}

/**
 * Batch transfer options
 */
export interface BatchTransferOptions {
  mint: PublicKey
  recipients: BatchTransferRecipient[]
  batchSize?: number
  delayMs?: number
  onProgress?: (completed: number, total: number) => void
  onError?: (error: Error, recipient: BatchTransferRecipient) => void
}

/**
 * Batch transfer result
 */
export interface BatchTransferResult {
  successful: number
  failed: number
  total: number
  signatures: string[]
  errors: Array<{ recipient: string; error: string }>
}

/**
 * Batch mint recipient
 */
export interface BatchMintRecipient {
  address: string | PublicKey
  amount: bigint
}

/**
 * Batch mint options
 */
export interface BatchMintOptions {
  mint: PublicKey
  recipients: BatchMintRecipient[]
  batchSize?: number
  delayMs?: number
  onProgress?: (completed: number, total: number) => void
  onError?: (error: Error, recipient: BatchMintRecipient) => void
}

/**
 * Batch mint result
 */
export interface BatchMintResult {
  successful: number
  failed: number
  total: number
  signatures: string[]
  errors: Array<{ recipient: string; error: string }>
}

/**
 * Batch NFT mint item
 */
export interface BatchNFTMintItem {
  name: string
  symbol: string
  uri: string
  recipient?: string | PublicKey
}

/**
 * Batch NFT mint options
 */
export interface BatchNFTMintOptions {
  collection?: PublicKey
  items: BatchNFTMintItem[]
  sellerFeeBasisPoints?: number
  batchSize?: number
  delayMs?: number
  onProgress?: (completed: number, total: number, mint?: string) => void
  onError?: (error: Error, item: BatchNFTMintItem) => void
}

/**
 * Batch NFT mint result
 */
export interface BatchNFTMintResult {
  successful: number
  failed: number
  total: number
  mints: string[]
  errors: Array<{ item: BatchNFTMintItem; error: string }>
}

/**
 * Batch operation status
 */
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/**
 * Batch job
 */
export interface BatchJob<T> {
  id: string
  status: BatchStatus
  total: number
  completed: number
  failed: number
  startedAt: Date
  completedAt?: Date
  results: T[]
  errors: Array<{ index: number; error: string }>
}
