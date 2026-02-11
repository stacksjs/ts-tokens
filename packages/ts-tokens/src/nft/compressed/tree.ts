/**
 * Merkle Tree Management for Compressed NFTs
 *
 * Create and manage Merkle trees for cNFT storage.
 */

import type {
  TransactionInstruction} from '@solana/web3.js';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram
} from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../../types'
import { sendAndConfirmTransaction, buildTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'
import { createConnection } from '../../drivers/solana/connection'

/**
 * SPL Account Compression Program ID
 */
const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK')

/**
 * SPL Noop Program ID (for logging)
 */
const SPL_NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV')

/**
 * Bubblegum Program ID (Metaplex compressed NFTs)
 */
const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY')

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
  // Header size
  const headerSize = 8 + // discriminator
    32 + // authority
    32 + // tree creator
    1 + // is public
    8 + // creation slot
    1   // padding

  // Changelog buffer size
  const changelogSize = maxBufferSize * (32 + 32 + 4 + 4) // path + index + _padding

  // Rightmost proof size
  const rightmostProofSize = maxDepth * 32

  // Canopy size
  const canopySize = canopyDepth > 0 ? ((1 << (canopyDepth + 1)) - 2) * 32 : 0

  // Tree nodes size
  const treeSize = (1 << maxDepth) * 32

  return headerSize + changelogSize + rightmostProofSize + canopySize + treeSize
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

  // Calculate space and rent
  const space = calculateTreeSpace(maxDepth, maxBufferSize, canopyDepth)
  const lamports = await connection.getMinimumBalanceForRentExemption(space)

  // Get tree authority PDA
  const [treeAuthority] = PublicKey.findProgramAddressSync(
    [tree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  )

  const instructions: TransactionInstruction[] = []

  // 1. Create account for tree
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: tree,
      space,
      lamports,
      programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    })
  )

  // 2. Initialize empty Merkle tree
  const initTreeData = serializeInitEmptyMerkleTree(maxDepth, maxBufferSize)
  instructions.push({
    keys: [
      { pubkey: tree, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    data: initTreeData,
  })

  // 3. Create tree config in Bubblegum
  const createTreeData = serializeCreateTree(maxDepth, maxBufferSize, config.public ?? false)
  instructions.push({
    keys: [
      { pubkey: treeAuthority, isSigner: false, isWritable: true },
      { pubkey: tree, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BUBBLEGUM_PROGRAM_ID,
    data: createTreeData,
  })

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
 * Serialize InitEmptyMerkleTree instruction
 */
function serializeInitEmptyMerkleTree(maxDepth: number, maxBufferSize: number): Buffer {
  const buffer = Buffer.alloc(12)
  // Discriminator for InitEmptyMerkleTree
  buffer.writeUInt8(0, 0)
  buffer.writeUInt32LE(maxDepth, 4)
  buffer.writeUInt32LE(maxBufferSize, 8)
  return buffer
}

/**
 * Serialize CreateTree instruction for Bubblegum
 */
function serializeCreateTree(maxDepth: number, maxBufferSize: number, isPublic: boolean): Buffer {
  const buffer = Buffer.alloc(13)
  // Discriminator for CreateTree
  buffer.writeUInt8(0, 0)
  buffer.writeUInt32LE(maxDepth, 1)
  buffer.writeUInt32LE(maxBufferSize, 5)
  buffer.writeUInt8(isPublic ? 1 : 0, 9)
  return buffer.slice(0, 10)
}

/**
 * Get Merkle tree info
 */
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

  // Parse tree header
  const data = accountInfo.data
  let offset = 8 // Skip discriminator

  const authority = new PublicKey(data.slice(offset, offset + 32)).toBase58()
  offset += 32

  // Skip to tree config
  offset += 32 + 1 + 8 + 1 // creator + is_public + creation_slot + padding

  const maxDepth = data.readUInt32LE(offset)
  offset += 4

  const maxBufferSize = data.readUInt32LE(offset)
  offset += 4

  const activeIndex = data.readUInt32LE(offset)
  offset += 4

  const bufferSize = data.readUInt32LE(offset)
  offset += 4

  // Get rightmost leaf
  const rightmostLeafOffset = offset + maxBufferSize * (32 + 32 + 4 + 4)
  const rightmostLeaf = Buffer.from(data.slice(rightmostLeafOffset, rightmostLeafOffset + 32)).toString('hex')

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
