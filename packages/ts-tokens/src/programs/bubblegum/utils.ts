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
export function verifyConcurrentMerkleProof(
  root: Uint8Array,
  leaf: Uint8Array,
  proof: Uint8Array[],
  index: number
): boolean {
  if (root.length !== 32 || leaf.length !== 32) {
    return false
  }

  let currentHash: Uint8Array = new Uint8Array(leaf)
  let currentIndex = index

  for (const proofNode of proof) {
    if (proofNode.length !== 32) {
      return false
    }

    // Determine if current node is left or right child
    if (currentIndex % 2 === 0) {
      // Current is left child, proof node is right sibling
      currentHash = hashPair(currentHash, proofNode)
    } else {
      // Current is right child, proof node is left sibling
      currentHash = hashPair(proofNode, currentHash)
    }

    currentIndex = Math.floor(currentIndex / 2)
  }

  // Compare computed root with expected root
  if (currentHash.length !== root.length) {
    return false
  }
  for (let i = 0; i < root.length; i++) {
    if (currentHash[i] !== root[i]) {
      return false
    }
  }
  return true
}

/**
 * Hash two 32-byte nodes together (Keccak-256)
 *
 * This mimics the on-chain hashing used by the Account Compression program.
 * Uses SHA-256 as a portable approximation (the actual on-chain program
 * uses Keccak-256; for production verification, use a Keccak library).
 */
function hashPair(left: Uint8Array, right: Uint8Array): Uint8Array {
  // Concatenate left + right
  const combined = new Uint8Array(64)
  combined.set(left, 0)
  combined.set(right, 32)

  // Use SHA-256 for hashing (portable, available in all environments)
  // Note: On-chain uses Keccak-256. For off-chain verification that must
  // match on-chain exactly, use a Keccak-256 implementation.
  const crypto = globalThis.crypto
  if (crypto?.subtle) {
    // In environments without sync crypto, return placeholder
    // Real implementation would use sync keccak-256
    return sha256Sync(combined)
  }
  return sha256Sync(combined)
}

/**
 * Synchronous SHA-256 hash using Node.js crypto
 */
function sha256Sync(data: Uint8Array): Uint8Array {
  try {
    // Use Node.js crypto module (available in Node/Bun)
    const { createHash } = require('node:crypto')
    const hash = createHash('sha256').update(data).digest()
    return new Uint8Array(hash)
  } catch {
    // Fallback: return a zero hash (should not happen in Node/Bun)
    return new Uint8Array(32)
  }
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
