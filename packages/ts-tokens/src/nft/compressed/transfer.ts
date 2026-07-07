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
    proof: transferOptions.proof.proof.map(p => new PublicKey(p)),
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
    proof: proof.proof.map(p => new PublicKey(p)),
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
