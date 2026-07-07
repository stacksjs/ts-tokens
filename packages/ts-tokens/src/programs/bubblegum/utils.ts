/**
 * Bubblegum Utilities
 *
 * Helper functions for working with compressed NFTs, including
 * Merkle proof verification and DAS API integration.
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Asset proof returned by DAS API
 */
export interface AssetProof {
  /** Merkle root */
  root: string
  /** Proof nodes (base58 encoded) */
  proof: string[]
  /** Node index in the tree */
  nodeIndex: number
  /** Leaf data */
  leaf: string
  /** Merkle tree address */
  treeId: string
}

/**
 * Verify a concurrent Merkle proof
 *
 * Checks that the given leaf, when hashed up through the proof path,
 * produces the expected Merkle root. This is the core verification
 * algorithm used by the Account Compression program.
 *
 * @param root - Expected Merkle root (32 bytes)
 * @param leaf - Leaf hash to verify (32 bytes)
 * @param proof - Array of sibling hashes along the path (each 32 bytes)
 * @param index - Leaf index in the tree (determines left/right at each level)
 * @returns True if the proof is valid
 */
// eslint-disable-next-line no-unused-vars
export function verifyConcurrentMerkleProof(
  root: Uint8Array,
  leaf: Uint8Array,
  proof: Uint8Array[],
  index: number
): boolean {
  // The SPL Account Compression program hashes node pairs with Keccak-256
  // (the same primitive Ethereum uses), not SHA-256 or SHA3-256. Node's
  // `crypto` module exposes neither Keccak-256 nor a synchronous SHA-256 that
  // matches, and no Keccak dependency is available here. Rather than silently
  // return an incorrect result, this is explicitly unimplemented.
  throw new Error(
    'verifyConcurrentMerkleProof is not implemented: on-chain proof '
    + 'verification requires Keccak-256, which is not available in this build. '
    + 'Verify proofs on-chain via the account-compression verifyLeaf instruction, '
    + 'or supply a Keccak-256 implementation.'
  )
}

/**
 * Fetch an asset proof from a DAS (Digital Asset Standard) API
 *
 * DAS APIs are provided by RPC providers like Helius, Triton, and others.
 * They index compressed NFT data and provide Merkle proofs needed for
 * transfer, burn, and other operations.
 *
 * @param dasApiUrl - DAS-compatible RPC endpoint URL
 * @param assetId - The asset ID (public key) of the compressed NFT
 * @returns Asset proof containing root, proof path, and leaf data
 */
export async function fetchAssetProof(
  dasApiUrl: string,
  assetId: string | PublicKey
): Promise<AssetProof> {
  const id = typeof assetId === 'string' ? assetId : assetId.toBase58()

  const response = await fetch(dasApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'ts-tokens',
      method: 'getAssetProof',
      params: { id },
    }),
  })

  if (!response.ok) {
    throw new Error(`DAS API request failed: ${response.statusText}`)
  }

  const json = await response.json()

  if (json.error) {
    throw new Error(`DAS API error: ${json.error.message || JSON.stringify(json.error)}`)
  }

  const result = json.result
  return {
    root: result.root,
    proof: result.proof,
    nodeIndex: result.node_index,
    leaf: result.leaf,
    treeId: result.tree_id,
  }
}
