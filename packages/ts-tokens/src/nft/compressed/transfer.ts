/**
 * Compressed NFT Transfers
 *
 * Transfer compressed NFTs between wallets.
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../../types'
import { sendAndConfirmTransaction, buildTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'
import { createConnection } from '../../drivers/solana/connection'

/**
 * Bubblegum Program ID
 */
const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY')

/**
 * SPL Account Compression Program ID
 */
const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK')

/**
 * SPL Noop Program ID
 */
const SPL_NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV')

/**
 * Asset proof for compressed NFT operations
 */
export interface AssetProof {
  root: string
  proof: string[]
  nodeIndex: number
  leaf: string
  treeId: string
}

/**
 * Transfer compressed NFT options
 */
export interface TransferCompressedNFTOptions {
  assetId: string
  tree: string
  newOwner: string
  proof: AssetProof
  leafOwner?: string
  leafDelegate?: string
  options?: TransactionOptions
}

/**
 * Transfer a compressed NFT
 */
export async function transferCompressedNFT(
  transferOptions: TransferCompressedNFTOptions,
  tokenConfig: TokenConfig
): Promise<TransactionResult> {
  const connection = createConnection(tokenConfig)
  const payer = loadWallet(tokenConfig)

  const treePubkey = new PublicKey(transferOptions.tree)
  const newOwner = new PublicKey(transferOptions.newOwner)
  const leafOwner = transferOptions.leafOwner
    ? new PublicKey(transferOptions.leafOwner)
    : payer.publicKey
  const leafDelegate = transferOptions.leafDelegate
    ? new PublicKey(transferOptions.leafDelegate)
    : leafOwner

  // Get tree authority PDA
  const [treeAuthority] = PublicKey.findProgramAddressSync(
    [treePubkey.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  )

  // Build transfer instruction
  const { proof, root, nodeIndex } = transferOptions.proof

  // Serialize transfer data
  const rootBytes = Buffer.from(root, 'hex')
  const dataHash = Buffer.alloc(32) // Would come from asset data
  const creatorHash = Buffer.alloc(32) // Would come from asset data
  const nonce = BigInt(nodeIndex)
  const index = nodeIndex

  const transferData = Buffer.alloc(1 + 32 + 32 + 32 + 8 + 4)
  let offset = 0

  // Discriminator for Transfer
  transferData.writeUInt8(12, offset)
  offset += 1

  // Root
  rootBytes.copy(transferData, offset)
  offset += 32

  // Data hash
  dataHash.copy(transferData, offset)
  offset += 32

  // Creator hash
  creatorHash.copy(transferData, offset)
  offset += 32

  // Nonce
  transferData.writeBigUInt64LE(nonce, offset)
  offset += 8

  // Index
  transferData.writeUInt32LE(index, offset)

  // Build keys
  const keys = [
    { pubkey: treeAuthority, isSigner: false, isWritable: false },
    { pubkey: leafOwner, isSigner: true, isWritable: false },
    { pubkey: leafDelegate, isSigner: false, isWritable: false },
    { pubkey: newOwner, isSigner: false, isWritable: false },
    { pubkey: treePubkey, isSigner: false, isWritable: true },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  // Add proof nodes
  for (const proofNode of proof) {
    keys.push({
      pubkey: new PublicKey(proofNode),
      isSigner: false,
      isWritable: false,
    })
  }

  const instruction: TransactionInstruction = {
    keys,
    programId: BUBBLEGUM_PROGRAM_ID,
    data: transferData,
  }

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    transferOptions.options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, transferOptions.options)
}

/**
 * Get asset proof from DAS API
 * Note: Requires a DAS-enabled RPC endpoint
 */
export async function getAssetProof(
  assetId: string,
  tokenConfig: TokenConfig
): Promise<AssetProof> {
  const connection = createConnection(tokenConfig)

  // Use DAS API to get proof
  // This requires an RPC that supports the DAS API
  const response = await (connection as any).rpc.getAssetProof({ id: assetId })

  if (!response || !response.result) {
    throw new Error('Failed to get asset proof. Ensure your RPC supports the DAS API.')
  }

  return {
    root: response.result.root,
    proof: response.result.proof,
    nodeIndex: response.result.node_index,
    leaf: response.result.leaf,
    treeId: response.result.tree_id,
  }
}

/**
 * Get asset data from DAS API
 */
export async function getAsset(
  assetId: string,
  tokenConfig: TokenConfig
): Promise<{
  id: string
  owner: string
  content: {
    metadata: {
      name: string
      symbol: string
    }
    json_uri: string
  }
  compression: {
    tree: string
    leafIndex: number
    dataHash: string
    creatorHash: string
  }
}> {
  const connection = createConnection(tokenConfig)

  const response = await (connection as any).rpc.getAsset({ id: assetId })

  if (!response || !response.result) {
    throw new Error('Failed to get asset. Ensure your RPC supports the DAS API.')
  }

  const result = response.result

  return {
    id: result.id,
    owner: result.ownership.owner,
    content: {
      metadata: {
        name: result.content.metadata.name,
        symbol: result.content.metadata.symbol,
      },
      json_uri: result.content.json_uri,
    },
    compression: {
      tree: result.compression.tree,
      leafIndex: result.compression.leaf_id,
      dataHash: result.compression.data_hash,
      creatorHash: result.compression.creator_hash,
    },
  }
}

/**
 * Burn a compressed NFT
 */
export async function burnCompressedNFT(
  assetId: string,
  tree: string,
  proof: AssetProof,
  tokenConfig: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(tokenConfig)
  const payer = loadWallet(tokenConfig)

  const treePubkey = new PublicKey(tree)

  // Get tree authority PDA
  const [treeAuthority] = PublicKey.findProgramAddressSync(
    [treePubkey.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  )

  // Serialize burn data (similar to transfer)
  const rootBytes = Buffer.from(proof.root, 'hex')
  const dataHash = Buffer.alloc(32)
  const creatorHash = Buffer.alloc(32)
  const nonce = BigInt(proof.nodeIndex)
  const index = proof.nodeIndex

  const burnData = Buffer.alloc(1 + 32 + 32 + 32 + 8 + 4)
  let offset = 0

  // Discriminator for Burn
  burnData.writeUInt8(13, offset)
  offset += 1

  rootBytes.copy(burnData, offset)
  offset += 32
  dataHash.copy(burnData, offset)
  offset += 32
  creatorHash.copy(burnData, offset)
  offset += 32
  burnData.writeBigUInt64LE(nonce, offset)
  offset += 8
  burnData.writeUInt32LE(index, offset)

  const keys = [
    { pubkey: treeAuthority, isSigner: false, isWritable: false },
    { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    { pubkey: payer.publicKey, isSigner: false, isWritable: false },
    { pubkey: treePubkey, isSigner: false, isWritable: true },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  // Add proof nodes
  for (const proofNode of proof.proof) {
    keys.push({
      pubkey: new PublicKey(proofNode),
      isSigner: false,
      isWritable: false,
    })
  }

  const instruction: TransactionInstruction = {
    keys,
    programId: BUBBLEGUM_PROGRAM_ID,
    data: burnData,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}
