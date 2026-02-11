/**
 * Compressed Token Types
 *
 * Types for compressed (ZK-compressed) fungible tokens via Light Protocol.
 */

/**
 * Compressed token mint info
 */
export interface CompressedToken {
  mint: string
  authority: string
  decimals: number
  supply: bigint
  isCompressed: true
}

/**
 * Compressed token account
 */
export interface CompressedTokenAccount {
  owner: string
  mint: string
  amount: bigint
  hash: string
  leafIndex: number
  tree: string
}

/**
 * Merkle proof for compressed token operations
 */
export interface CompressedTokenProof {
  root: string
  proof: string[]
  leafIndex: number
  hash: string
}

/**
 * Options for creating a compressed token mint
 */
export interface CreateCompressedTokenOptions {
  decimals?: number
  authority?: string
}

/**
 * Options for minting compressed tokens
 */
export interface MintCompressedTokenOptions {
  mint: string
  destination: string
  amount: bigint
}

/**
 * Options for transferring compressed tokens
 */
export interface TransferCompressedTokenOptions {
  mint: string
  to: string
  amount: bigint
  proof?: CompressedTokenProof
}
