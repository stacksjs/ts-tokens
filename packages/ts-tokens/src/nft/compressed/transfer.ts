/**
 * Compressed NFT Transfers
 *
 * Transfer and burn compressed NFTs between wallets. The instruction data is
 * built by the canonical Bubblegum builders in
 * programs/bubblegum/instructions.ts so account ordering and discriminators
 * stay in sync with the on-chain program.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../../types'
import { sendAndConfirmTransaction, buildTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'
import { createConnection } from '../../drivers/solana/connection'
import { transfer as buildTransferIx, burn as buildBurnIx } from '../../programs/bubblegum/instructions'
import { findTreeAuthorityPda } from '../../programs/bubblegum/pda'

/**
 * Asset proof for compressed NFT operations
 */
export interface AssetProof {
  /** Merkle root (base58-encoded) */
  root: string
  /** Proof nodes (base58-encoded pubkeys) */
  proof: string[]
  /** Node index in the tree (from DAS getAssetProof) */
  nodeIndex: number
  /** Leaf hash (base58-encoded) */
  leaf: string
  /** Merkle tree address */
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
 * Make a DAS API JSON-RPC call against the configured RPC endpoint.
 * Requires a DAS-compatible RPC (e.g. Helius, Triton).
 */
async function dasApiCall(
  rpcUrl: string,
  method: string,
  params: Record<string, unknown>
): Promise<any> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'ts-tokens',
      method,
      params,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`DAS API request failed: ${response.statusText}`)
  }

  const json = await response.json()

  if (json.error) {
    throw new Error(`DAS API error: ${json.error.message || JSON.stringify(json.error)}`)
  }

  return json.result
}

/**
 * Decode a base58-encoded 32-byte hash into a raw byte buffer.
 */
function decodeHash(value: string): Uint8Array {
  return new PublicKey(value).toBuffer()
}

/**
 * Read a concurrent Merkle tree's maxDepth and canopyDepth from its account.
 *
 * The account layout is:
 *   header (56)  = accountType(1) + version(1) + maxBufferSize(u32) +
 *                  maxDepth(u32) + authority(32) + creationSlot(u64) + pad(6)
 *   serialized tree preamble (24) = sequenceNumber/activeIndex/bufferSize (3x u64)
 *   changelog     = maxBufferSize * (32 * (maxDepth + 1) + 8)
 *   rightmost proof = 32 * maxDepth + 40
 *   canopy        = (2^(canopyDepth+1) - 2) * 32
 *
 * The canopy caches the top `canopyDepth` levels of the tree, so a valid proof
 * submitted to Bubblegum must be truncated to `maxDepth - canopyDepth` nodes.
 */
async function getTreeDepths(
  connection: ReturnType<typeof createConnection>,
  tree: PublicKey
): Promise<{ maxDepth: number; canopyDepth: number }> {
  const accountInfo = await connection.getAccountInfo(tree)
  if (!accountInfo) {
    throw new Error(`Merkle tree account not found: ${tree.toBase58()}`)
  }

  const data = accountInfo.data
  const maxBufferSize = data.readUInt32LE(2)
  const maxDepth = data.readUInt32LE(6)

  const headerSize = 56
  const treePreamble = 24
  const changelogSize = maxBufferSize * (32 * (maxDepth + 1) + 8)
  const rightmostProofSize = 32 * maxDepth + 40

  const canopyBytes = data.length - (headerSize + treePreamble + changelogSize + rightmostProofSize)
  let canopyDepth = 0
  if (canopyBytes > 0) {
    const canopyNodes = Math.floor(canopyBytes / 32)
    // canopyNodes = 2^(canopyDepth+1) - 2  =>  canopyDepth = log2(canopyNodes + 2) - 1
    canopyDepth = Math.round(Math.log2(canopyNodes + 2)) - 1
    if (canopyDepth < 0) canopyDepth = 0
  }

  return { maxDepth, canopyDepth }
}

/**
 * Truncate a full Merkle proof to the length Bubblegum expects for a tree with
 * a canopy: proof.length must equal `maxDepth - canopyDepth`.
 */
function truncateProofForCanopy(
  proof: PublicKey[],
  maxDepth: number,
  canopyDepth: number
): PublicKey[] {
  const expectedLength = maxDepth - canopyDepth
  if (expectedLength < 0 || expectedLength > proof.length) {
    return proof
  }
  return proof.slice(0, expectedLength)
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

  const [treeAuthority] = findTreeAuthorityPda(treePubkey)

  // Fetch the asset to obtain the data/creator hashes and leaf index; these
  // are not present in a proof response.
  const asset = await getAsset(transferOptions.assetId, tokenConfig)

  // Truncate the proof to account for the tree's canopy. Bubblegum expects
  // proof.length == maxDepth - canopyDepth; a full proof would be rejected.
  const { maxDepth, canopyDepth } = await getTreeDepths(connection, treePubkey)
  const proof = truncateProofForCanopy(
    transferOptions.proof.proof.map(p => new PublicKey(p)),
    maxDepth,
    canopyDepth
  )

  const instruction = buildTransferIx({
    merkleTree: treePubkey,
    treeAuthority,
    leafOwner,
    leafDelegate,
    newLeafOwner: newOwner,
    root: decodeHash(transferOptions.proof.root),
    dataHash: decodeHash(asset.compression.dataHash),
    creatorHash: decodeHash(asset.compression.creatorHash),
    nonce: BigInt(asset.compression.leafIndex),
    index: asset.compression.leafIndex,
    proof,
  })

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

  const result = await dasApiCall(connection.rpcEndpoint, 'getAssetProof', { id: assetId })

  if (!result) {
    throw new Error('Failed to get asset proof. Ensure your RPC supports the DAS API.')
  }

  return {
    root: result.root,
    proof: result.proof,
    nodeIndex: result.node_index,
    leaf: result.leaf,
    treeId: result.tree_id,
  }
}

/**
 * Get asset data from DAS API
 */
// eslint-disable-next-line no-unused-vars
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

  const result = await dasApiCall(connection.rpcEndpoint, 'getAsset', { id: assetId })

  if (!result) {
    throw new Error('Failed to get asset. Ensure your RPC supports the DAS API.')
  }

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

  const [treeAuthority] = findTreeAuthorityPda(treePubkey)

  const asset = await getAsset(assetId, tokenConfig)

  // Truncate the proof to account for the tree's canopy. Bubblegum expects
  // proof.length == maxDepth - canopyDepth; a full proof would be rejected.
  const { maxDepth, canopyDepth } = await getTreeDepths(connection, treePubkey)
  const truncatedProof = truncateProofForCanopy(
    proof.proof.map(p => new PublicKey(p)),
    maxDepth,
    canopyDepth
  )

  const instruction = buildBurnIx({
    merkleTree: treePubkey,
    treeAuthority,
    leafOwner: payer.publicKey,
    leafDelegate: payer.publicKey,
    root: decodeHash(proof.root),
    dataHash: decodeHash(asset.compression.dataHash),
    creatorHash: decodeHash(asset.compression.creatorHash),
    nonce: BigInt(asset.compression.leafIndex),
    index: asset.compression.leafIndex,
    proof: truncatedProof,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}
