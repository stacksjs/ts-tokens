/**
 * Merkle Tree Management for Compressed NFTs
 *
 * Create and manage Merkle trees for cNFT storage.
 */

import type {
  TransactionInstruction} from '@solana/web3.js';
import {
  Keypair,
  PublicKey,
  SystemProgram
} from '@solana/web3.js'
import type { TokenConfig, TransactionOptions } from '../../types'
import { sendAndConfirmTransaction, buildTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'
import { createConnection } from '../../drivers/solana/connection'
import { createTree as buildCreateTreeIx } from '../../programs/bubblegum/instructions'
import { findTreeAuthorityPda } from '../../programs/bubblegum/pda'
import { assertValidTreeConfig } from '../../programs/account-compression/types'

/**
 * SPL Account Compression Program ID
 */
const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK')

/**
 * Merkle tree configuration
 */
export interface MerkleTreeConfig {
  maxDepth: number
  maxBufferSize: number
  canopyDepth?: number
  public?: boolean
}

/**
 * Merkle tree result
 */
export interface MerkleTreeResult {
  tree: string
  authority: string
  signature: string
  maxDepth: number
  maxBufferSize: number
  canopyDepth: number
  capacity: number
}

/**
 * Calculate tree capacity from depth
 */
export function calculateTreeCapacity(maxDepth: number): number {
  return Math.pow(2, maxDepth)
}

/**
 * Calculate required space for Merkle tree account
 */
export function calculateTreeSpace(maxDepth: number, maxBufferSize: number, canopyDepth: number = 0): number {
  // Concurrent Merkle tree account layout:
  //   header (56) + serialized-tree preamble (24)
  //   + changelog: maxBufferSize * (32 * (maxDepth + 1) + 8)
  //   + rightmost proof: 32 * maxDepth + 40
  //   + canopy
  const headerSize = 56
  const treePreamble = 24

  const changelogSize = maxBufferSize * (32 * (maxDepth + 1) + 8)

  const rightmostProofSize = 32 * maxDepth + 40

  // Canopy stores the top `canopyDepth` levels: (2^(canopyDepth+1) - 2) nodes.
  const canopySize = canopyDepth > 0 ? ((1 << (canopyDepth + 1)) - 2) * 32 : 0

  return headerSize + treePreamble + changelogSize + rightmostProofSize + canopySize
}

/**
 * Create a new Merkle tree for compressed NFTs
 */
export async function createMerkleTree(
  config: MerkleTreeConfig,
  tokenConfig: TokenConfig,
  options?: TransactionOptions
): Promise<MerkleTreeResult> {
  const connection = createConnection(tokenConfig)
  const payer = loadWallet(tokenConfig)

  // Generate tree keypair
  const treeKeypair = Keypair.generate()
  const tree = treeKeypair.publicKey

  const { maxDepth, maxBufferSize, canopyDepth = 0 } = config

  // Reject invalid depth/buffer-size pairs before building any tx.
  assertValidTreeConfig(maxDepth, maxBufferSize)

  // Calculate space and rent
  const space = calculateTreeSpace(maxDepth, maxBufferSize, canopyDepth)
  const lamports = await connection.getMinimumBalanceForRentExemption(space)

  // Get tree authority PDA
  const [treeAuthority] = findTreeAuthorityPda(tree)

  const instructions: TransactionInstruction[] = []

  // 1. Allocate a zeroed account owned by the compression program. Bubblegum's
  //    create_tree requires an `#[account(zero)]` merkle tree and performs the
  //    init_empty_merkle_tree CPI itself — do NOT pre-initialize it here.
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: tree,
      space,
      lamports,
      programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    })
  )

  // 2. Create tree config in Bubblegum (this also initializes the tree).
  instructions.push(
    buildCreateTreeIx({
      merkleTree: tree,
      treeAuthority,
      payer: payer.publicKey,
      treeCreator: payer.publicKey,
      maxDepth,
      maxBufferSize,
      canopyDepth,
      public: config.public,
    })
  )

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options
  )

  transaction.partialSign(treeKeypair)
  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options)

  return {
    tree: tree.toBase58(),
    authority: treeAuthority.toBase58(),
    signature: result.signature,
    maxDepth,
    maxBufferSize,
    canopyDepth,
    capacity: calculateTreeCapacity(maxDepth),
  }
}

/**
 * Get Merkle tree info
 */
// eslint-disable-next-line no-unused-vars
export async function getMerkleTreeInfo(
  tree: string,
  tokenConfig: TokenConfig
): Promise<{
  authority: string
  maxDepth: number
  maxBufferSize: number
  activeIndex: number
  bufferSize: number
  rightmostLeaf: string
}> {
  const connection = createConnection(tokenConfig)
  const treePubkey = new PublicKey(tree)

  const accountInfo = await connection.getAccountInfo(treePubkey)
  if (!accountInfo) {
    throw new Error('Merkle tree not found')
  }

  // Concurrent Merkle tree header (56 bytes):
  //   byte 0      accountType (u8)
  //   byte 1      headerVersion (u8)
  //   byte 2..6   maxBufferSize (u32)
  //   byte 6..10  maxDepth (u32)
  //   byte 10..42 authority (32)
  //   byte 42..50 creationSlot (u64)
  //   byte 50..56 padding (6)
  const data = accountInfo.data

  const maxBufferSize = data.readUInt32LE(2)
  const maxDepth = data.readUInt32LE(6)
  const authority = new PublicKey(data.slice(10, 42)).toBase58()

  // Serialized concurrent Merkle tree follows the header:
  //   sequenceNumber (u64), activeIndex (u64), bufferSize (u64)
  let offset = 56
  offset += 8 // sequenceNumber
  const activeIndex = Number(data.readBigUInt64LE(offset))
  offset += 8
  const bufferSize = Number(data.readBigUInt64LE(offset))
  offset += 8

  // The change log buffer follows; the current root is the first change log
  // entry's root. Expose the active leaf position instead of a leaf hash here.
  const rightmostLeaf = ''

  return {
    authority,
    maxDepth,
    maxBufferSize,
    activeIndex,
    bufferSize,
    rightmostLeaf,
  }
}

/**
 * Get tree capacity and usage
 */
// eslint-disable-next-line no-unused-vars
export async function getTreeCapacity(
  tree: string,
  tokenConfig: TokenConfig
): Promise<{
  total: number
  used: number
  remaining: number
}> {
  const info = await getMerkleTreeInfo(tree, tokenConfig)
  const total = calculateTreeCapacity(info.maxDepth)
  const used = info.activeIndex

  return {
    total,
    used,
    remaining: total - used,
  }
}

/**
 * Common tree configurations
 */
export const TREE_CONFIGS = {
  // Small: ~16K NFTs
  small: { maxDepth: 14, maxBufferSize: 64, canopyDepth: 0 },
  // Medium: ~1M NFTs
  medium: { maxDepth: 20, maxBufferSize: 256, canopyDepth: 10 },
  // Large: ~1B NFTs
  large: { maxDepth: 30, maxBufferSize: 2048, canopyDepth: 14 },
} as const
