/**
 * Account Compression Program Instructions
 *
 * Raw instruction builders for the SPL Account Compression program.
 * Program ID: cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js'

const ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK')
const SPL_NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV')

// Instruction discriminators
const INIT_MERKLE_TREE_DISCRIMINATOR = Buffer.from([0])
const APPEND_LEAF_DISCRIMINATOR = Buffer.from([1])
const REPLACE_LEAF_DISCRIMINATOR = Buffer.from([4])
const VERIFY_LEAF_DISCRIMINATOR = Buffer.from([7])

/**
 * Initialize a new concurrent Merkle tree
 *
 * Creates an empty Merkle tree account for use with compressed NFTs
 * or other applications requiring on-chain state compression.
 *
 * @param params.merkleTree - Pre-allocated account for the tree data
 * @param params.authority - Tree authority (can append/modify)
 * @param params.payer - Payer for account creation
 * @param params.maxDepth - Maximum tree depth (determines max capacity: 2^depth)
 * @param params.maxBufferSize - Size of the changelog buffer for concurrent updates
 * @returns TransactionInstruction
 */
export function initMerkleTree(params: {
  merkleTree: PublicKey
  authority: PublicKey
  payer: PublicKey
  maxDepth: number
  maxBufferSize: number
}): TransactionInstruction {
  const keys = [
    { pubkey: params.merkleTree, isSigner: false, isWritable: true },
    { pubkey: params.authority, isSigner: true, isWritable: false },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  const maxDepthBuffer = Buffer.alloc(4)
  maxDepthBuffer.writeUInt32LE(params.maxDepth)

  const maxBufferSizeBuffer = Buffer.alloc(4)
  maxBufferSizeBuffer.writeUInt32LE(params.maxBufferSize)

  const data = Buffer.concat([
    INIT_MERKLE_TREE_DISCRIMINATOR,
    maxDepthBuffer,
    maxBufferSizeBuffer,
  ])

  return new TransactionInstruction({
    keys,
    programId: ACCOUNT_COMPRESSION_PROGRAM_ID,
    data,
  })
}

/**
 * Append a new leaf to the Merkle tree
 *
 * Adds a new leaf node to the next available position in the tree.
 * This updates the root and changelog.
 *
 * @param params.merkleTree - Merkle tree account
 * @param params.authority - Tree authority (signer)
 * @param params.leaf - 32-byte leaf hash to append
 * @returns TransactionInstruction
 */
export function appendLeaf(params: {
  merkleTree: PublicKey
  authority: PublicKey
  leaf: Uint8Array
}): TransactionInstruction {
  if (params.leaf.length !== 32) {
    throw new Error('Leaf must be exactly 32 bytes')
  }

  const keys = [
    { pubkey: params.merkleTree, isSigner: false, isWritable: true },
    { pubkey: params.authority, isSigner: true, isWritable: false },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  const data = Buffer.concat([
    APPEND_LEAF_DISCRIMINATOR,
    Buffer.from(params.leaf),
  ])

  return new TransactionInstruction({
    keys,
    programId: ACCOUNT_COMPRESSION_PROGRAM_ID,
    data,
  })
}

/**
 * Replace a leaf in the Merkle tree
 *
 * Replaces an existing leaf with a new value. Requires the current root,
 * the previous leaf value, the new leaf value, and a Merkle proof.
 *
 * @param params.merkleTree - Merkle tree account
 * @param params.authority - Tree authority (signer)
 * @param params.root - Current Merkle root (32 bytes)
 * @param params.previousLeaf - Current leaf value being replaced (32 bytes)
 * @param params.newLeaf - New leaf value (32 bytes)
 * @param params.index - Leaf index in the tree
 * @param params.proof - Merkle proof nodes (each 32 bytes)
 * @returns TransactionInstruction
 */
export function replaceLeaf(params: {
  merkleTree: PublicKey
  authority: PublicKey
  root: Uint8Array
  previousLeaf: Uint8Array
  newLeaf: Uint8Array
  index: number
  proof: PublicKey[]
}): TransactionInstruction {
  const keys = [
    { pubkey: params.merkleTree, isSigner: false, isWritable: true },
    { pubkey: params.authority, isSigner: true, isWritable: false },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
    // Proof accounts
    ...params.proof.map(p => ({ pubkey: p, isSigner: false, isWritable: false })),
  ]

  const indexBuffer = Buffer.alloc(4)
  indexBuffer.writeUInt32LE(params.index)

  const data = Buffer.concat([
    REPLACE_LEAF_DISCRIMINATOR,
    Buffer.from(params.root),
    Buffer.from(params.previousLeaf),
    Buffer.from(params.newLeaf),
    indexBuffer,
  ])

  return new TransactionInstruction({
    keys,
    programId: ACCOUNT_COMPRESSION_PROGRAM_ID,
    data,
  })
}

/**
 * Verify a leaf exists in the Merkle tree
 *
 * On-chain verification that a leaf is present at a specific index.
 * This does not modify the tree; it only verifies the proof.
 *
 * @param params.merkleTree - Merkle tree account
 * @param params.root - Expected Merkle root (32 bytes)
 * @param params.leaf - Leaf hash to verify (32 bytes)
 * @param params.index - Leaf index in the tree
 * @param params.proof - Merkle proof nodes (each 32 bytes)
 * @returns TransactionInstruction
 */
export function verifyLeaf(params: {
  merkleTree: PublicKey
  root: Uint8Array
  leaf: Uint8Array
  index: number
  proof: PublicKey[]
}): TransactionInstruction {
  const keys = [
    { pubkey: params.merkleTree, isSigner: false, isWritable: false },
    // Proof accounts
    ...params.proof.map(p => ({ pubkey: p, isSigner: false, isWritable: false })),
  ]

  const indexBuffer = Buffer.alloc(4)
  indexBuffer.writeUInt32LE(params.index)

  const data = Buffer.concat([
    VERIFY_LEAF_DISCRIMINATOR,
    Buffer.from(params.root),
    Buffer.from(params.leaf),
    indexBuffer,
  ])

  return new TransactionInstruction({
    keys,
    programId: ACCOUNT_COMPRESSION_PROGRAM_ID,
    data,
  })
}
