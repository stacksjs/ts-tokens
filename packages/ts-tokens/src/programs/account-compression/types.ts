/**
 * Account Compression Program Types
 *
 * Types for the SPL Account Compression program used by Bubblegum
 * for compressed NFT Merkle trees.
 *
 * Program ID: cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Account Compression Program ID
 */
export const ACCOUNT_COMPRESSION_PROGRAM_ID = 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'

/**
 * SPL Noop Program ID (used for logging leaf data)
 */
export const SPL_NOOP_PROGRAM_ID = 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'

/**
 * Concurrent Merkle tree header
 */
export interface ConcurrentMerkleTreeHeader {
  /** Account type discriminator */
  accountType: number
  /** Header version */
  headerVersion: number
  /** Maximum tree depth */
  maxDepth: number
  /** Maximum buffer size for concurrent updates */
  maxBufferSize: number
  /** Authority that can append/modify the tree */
  authority: PublicKey
  /** Creation slot */
  creationSlot: bigint
  /** Whether the tree is public (anyone can append) */
  isPublic: boolean
}

/**
 * Merkle tree node (32-byte hash)
 */
export type MerkleTreeNode = Uint8Array

/**
 * Concurrent Merkle proof
 */
export interface ConcurrentMerkleProof {
  /** Root hash of the tree */
  root: MerkleTreeNode
  /** Leaf hash being proven */
  leaf: MerkleTreeNode
  /** Sibling hashes along the path from leaf to root */
  proof: MerkleTreeNode[]
  /** Leaf index in the tree */
  index: number
}

/**
 * Change log entry for concurrent tree updates
 */
export interface ChangeLogEntry {
  /** New root after the change */
  root: MerkleTreeNode
  /** Path of nodes that changed */
  pathNodes: MerkleTreeNode[]
  /** Index of the leaf that changed */
  index: number
  /** Sequence number */
  seq: bigint
}

/**
 * Canopy depth configuration
 *
 * The canopy stores the top N levels of the tree on-chain,
 * reducing the number of proof nodes needed in transactions.
 */
export interface CanopyConfig {
  /** Number of tree levels stored on-chain */
  depth: number
}

/**
 * Tree size presets for common use cases
 */
export const TREE_SIZE_PRESETS: Record<string, { maxDepth: number; maxBufferSize: number; canopyDepth: number }> = {
  /** ~100 assets */
  small: { maxDepth: 14, maxBufferSize: 64, canopyDepth: 0 },
  /** ~16,000 assets */
  medium: { maxDepth: 20, maxBufferSize: 256, canopyDepth: 10 },
  /** ~1 million assets */
  large: { maxDepth: 30, maxBufferSize: 1024, canopyDepth: 14 },
  /** ~1 billion assets */
  xlarge: { maxDepth: 30, maxBufferSize: 2048, canopyDepth: 18 },
}

/**
 * Calculate the Merkle tree account size in bytes
 *
 * @param maxDepth - Maximum tree depth
 * @param maxBufferSize - Maximum concurrent update buffer size
 * @param canopyDepth - Number of canopy levels (optional, defaults to 0)
 * @returns Account size in bytes
 */
export function getMerkleTreeAccountSize(
  maxDepth: number,
  maxBufferSize: number,
  canopyDepth: number = 0
): number {
  // Header: 2 (discriminator) + 54 (header fields)
  const headerSize = 56
  // Change log: maxBufferSize * (32 * (maxDepth + 1) + 4 + 8)
  const changeLogSize = maxBufferSize * (32 * (maxDepth + 1) + 4 + 8)
  // Right-most path: maxDepth * 32
  const rightMostPathSize = maxDepth * 32
  // Canopy: (2^(canopyDepth+1) - 2) * 32
  const canopySize = canopyDepth > 0 ? ((1 << (canopyDepth + 1)) - 2) * 32 : 0

  return headerSize + changeLogSize + rightMostPathSize + canopySize
}
