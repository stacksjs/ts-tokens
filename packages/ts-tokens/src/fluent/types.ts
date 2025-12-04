/**
 * Fluent API Types
 */

import type { PublicKey, TransactionInstruction, Keypair } from '@solana/web3.js'

/**
 * Operation in the chain
 */
export interface ChainedOperation {
  type: string
  params: Record<string, unknown>
  instructions?: TransactionInstruction[]
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean
  signatures: string[]
  operations: ChainedOperation[]
  errors: Array<{ operation: string; error: string }>
}

/**
 * Dry run result
 */
export interface DryRunResult {
  operations: ChainedOperation[]
  estimatedFee: number
  estimatedTime: number
  warnings: string[]
}

/**
 * Builder options
 */
export interface BuilderOptions {
  dryRun?: boolean
  skipPreflight?: boolean
  maxRetries?: number
  priorityLevel?: 'none' | 'low' | 'medium' | 'high'
}

/**
 * Token creation params
 */
export interface TokenCreationParams {
  name: string
  symbol: string
  decimals?: number
  initialSupply?: bigint
  mintAuthority?: PublicKey
  freezeAuthority?: PublicKey
}

/**
 * Mint params
 */
export interface MintParams {
  amount: bigint
  to?: PublicKey
}

/**
 * Transfer params
 */
export interface TransferParams {
  to: PublicKey
  amount: bigint
}

/**
 * Burn params
 */
export interface BurnParams {
  amount: bigint
}

/**
 * NFT creation params
 */
export interface NFTCreationParams {
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints?: number
  creators?: Array<{ address: PublicKey; share: number }>
  collection?: PublicKey
}

/**
 * Collection creation params
 */
export interface CollectionCreationParams {
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints?: number
}

/**
 * Metadata update params
 */
export interface MetadataUpdateParams {
  name?: string
  symbol?: string
  uri?: string
  sellerFeeBasisPoints?: number
}
