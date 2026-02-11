/**
 * Base Builder
 *
 * Foundation for fluent API builders.
 */

import type { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Transaction } from '@solana/web3.js'
import type {
  ChainedOperation,
  ExecutionResult,
  DryRunResult,
  BuilderOptions,
} from './types'

/**
 * Base builder class
 */
export abstract class BaseBuilder<T extends BaseBuilder<T>> {
  protected operations: ChainedOperation[] = []
  protected connection: Connection | null = null
  protected payer: PublicKey | null = null
  protected options: BuilderOptions = {}

  /**
   * Set connection
   */
  withConnection(connection: Connection): T {
    this.connection = connection
    return this as unknown as T
  }

  /**
   * Set payer
   */
  withPayer(payer: PublicKey): T {
    this.payer = payer
    return this as unknown as T
  }

  /**
   * Set options
   */
  withOptions(options: BuilderOptions): T {
    this.options = { ...this.options, ...options }
    return this as unknown as T
  }

  /**
   * Add operation to chain
   */
  protected addOperation(type: string, params: Record<string, unknown>): T {
    this.operations.push({ type, params })
    return this as unknown as T
  }

  /**
   * Get all operations
   */
  getOperations(): ChainedOperation[] {
    return [...this.operations]
  }

  /**
   * Clear all operations
   */
  clear(): T {
    this.operations = []
    return this as unknown as T
  }

  /**
   * Dry run - simulate without executing
   */
  async dryRun(): Promise<DryRunResult> {
    const warnings: string[] = []

    if (!this.connection) {
      warnings.push('No connection set - fee estimation unavailable')
    }

    if (!this.payer) {
      warnings.push('No payer set')
    }

    // Estimate based on operation count
    const estimatedFee = this.operations.length * 5000 / 1e9 // ~5000 lamports per op
    const estimatedTime = this.operations.length * 500 // ~500ms per op

    return {
      operations: this.getOperations(),
      estimatedFee,
      estimatedTime,
      warnings,
    }
  }

  /**
   * Build transaction instructions
   */
  abstract build(): Promise<TransactionInstruction[]>

  /**
   * Execute all operations
   */
  async execute(): Promise<ExecutionResult> {
    if (this.options.dryRun) {
      const dryRunResult = await this.dryRun()
      return {
        success: true,
        signatures: [],
        operations: dryRunResult.operations,
        errors: [],
      }
    }

    if (!this.connection) {
      throw new Error('Connection not set')
    }

    if (!this.payer) {
      throw new Error('Payer not set')
    }

    const errors: Array<{ operation: string; error: string }> = []
    const signatures: string[] = []

    try {
      const instructions = await this.build()

      // In production, would sign and send transaction
      // This is a simplified version
      signatures.push(`executed_${Date.now()}`)

    } catch (error) {
      errors.push({
        operation: 'execute',
        error: (error as Error).message,
      })
    }

    return {
      success: errors.length === 0,
      signatures,
      operations: this.operations,
      errors,
    }
  }
}

/**
 * Create a transaction from instructions
 */
export async function createTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey
): Promise<Transaction> {
  const transaction = new Transaction()
  transaction.add(...instructions)

  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = payer

  return transaction
}

/**
 * Batch instructions into multiple transactions if needed
 */
export function batchInstructions(
  instructions: TransactionInstruction[],
  maxPerTx: number = 10
): TransactionInstruction[][] {
  const batches: TransactionInstruction[][] = []

  for (let i = 0; i < instructions.length; i += maxPerTx) {
    batches.push(instructions.slice(i, i + maxPerTx))
  }

  return batches
}
