/**
 * Transaction Types
 *
 * Type definitions for blockchain transactions.
 */

import type { Commitment } from './config'

/**
 * Transaction options
 */
export interface TransactionOptions {
  /**
   * Skip preflight simulation
   * @default false
   */
  skipPreflight?: boolean

  /**
   * Commitment level for confirmation
   * @default 'confirmed'
   */
  commitment?: Commitment

  /**
   * Maximum number of retries on failure
   * @default 3
   */
  maxRetries?: number

  /**
   * Priority fee in microlamports per compute unit, or a named level
   */
  priorityFee?: 'none' | 'low' | 'medium' | 'high' | number

  /**
   * Compute unit limit
   */
  computeUnits?: number

  /**
   * Additional signers (keypairs)
   */
  signers?: unknown[]

  /**
   * Timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Run in dry-run mode (simulate only, don't send)
   * @default false
   */
  dryRun?: boolean
}

/**
 * Transaction result
 */
export interface TransactionResult {
  /**
   * Transaction signature
   */
  signature: string

  /**
   * Whether transaction was confirmed
   */
  confirmed: boolean

  /**
   * Slot number where transaction was confirmed
   */
  slot?: number

  /**
   * Block time (Unix timestamp)
   */
  blockTime?: number

  /**
   * Compute units consumed
   */
  computeUnitsConsumed?: number

  /**
   * Transaction fee in lamports
   */
  fee?: number

  /**
   * Error message if transaction failed
   */
  error?: string

  /**
   * Transaction logs
   */
  logs?: string[]
}

/**
 * Transaction status
 */
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'finalized'
  | 'failed'
  | 'expired'

/**
 * Detailed transaction info
 */
export interface TransactionInfo {
  /**
   * Transaction signature
   */
  signature: string

  /**
   * Current status
   */
  status: TransactionStatus

  /**
   * Slot number
   */
  slot: number

  /**
   * Block time (Unix timestamp)
   */
  blockTime: number | null

  /**
   * Transaction fee in lamports
   */
  fee: number

  /**
   * Whether transaction succeeded
   */
  success: boolean

  /**
   * Error message if failed
   */
  error?: string

  /**
   * Transaction logs
   */
  logs: string[]

  /**
   * Compute units consumed
   */
  computeUnitsConsumed: number

  /**
   * Account keys involved
   */
  accountKeys: string[]

  /**
   * Instructions in the transaction
   */
  instructions: TransactionInstruction[]
}

/**
 * Transaction instruction info
 */
export interface TransactionInstruction {
  /**
   * Program ID
   */
  programId: string

  /**
   * Account indices
   */
  accounts: number[]

  /**
   * Instruction data (base64 encoded)
   */
  data: string

  /**
   * Decoded instruction (if known program)
   */
  decoded?: {
    name: string
    args: Record<string, unknown>
  }
}

/**
 * Batch transaction options
 */
export interface BatchTransactionOptions extends TransactionOptions {
  /**
   * Maximum instructions per transaction
   * @default 10
   */
  maxInstructionsPerTx?: number

  /**
   * Delay between transactions in milliseconds
   * @default 0
   */
  delayBetweenTxs?: number

  /**
   * Continue on individual transaction failure
   * @default false
   */
  continueOnError?: boolean
}

/**
 * Batch transaction result
 */
export interface BatchTransactionResult {
  /**
   * Total number of transactions
   */
  total: number

  /**
   * Number of successful transactions
   */
  successful: number

  /**
   * Number of failed transactions
   */
  failed: number

  /**
   * Individual transaction results
   */
  results: TransactionResult[]

  /**
   * Errors by index
   */
  errors: Map<number, string>
}

/**
 * Transaction simulation result
 */
export interface SimulationResult {
  /**
   * Whether simulation succeeded
   */
  success: boolean

  /**
   * Error message if simulation failed
   */
  error?: string

  /**
   * Simulation logs
   */
  logs: string[]

  /**
   * Compute units that would be consumed
   */
  unitsConsumed: number

  /**
   * Account changes that would occur
   */
  accountChanges?: Array<{
    address: string
    before: { lamports: bigint; data: string }
    after: { lamports: bigint; data: string }
  }>

  /**
   * Return data from the transaction
   */
  returnData?: {
    programId: string
    data: string
  }
}

/**
 * Priority fee estimation
 */
export interface PriorityFeeEstimate {
  /**
   * Minimum fee for inclusion
   */
  min: number

  /**
   * Low priority fee (slower confirmation)
   */
  low: number

  /**
   * Medium priority fee (normal confirmation)
   */
  medium: number

  /**
   * High priority fee (fast confirmation)
   */
  high: number

  /**
   * Very high priority fee (urgent)
   */
  veryHigh: number
}
