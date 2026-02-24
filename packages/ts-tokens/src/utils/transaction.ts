/**
 * Transaction Utilities
 *
 * Optimization, priority fees, and transaction management.
 */

import type {
  Connection,
  PublicKey,
  TransactionInstruction,
  AddressLookupTableAccount} from '@solana/web3.js';
import {
  Transaction,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'

/**
 * Priority fee level
 */
export type PriorityLevel = 'none' | 'low' | 'medium' | 'high' | 'turbo'

/**
 * Transaction options
 */
export interface TransactionOptions {
  priorityLevel?: PriorityLevel
  computeUnits?: number
  skipPreflight?: boolean
  maxRetries?: number
}

/**
 * Get priority fee for a level
 */
export function getPriorityFee(level: PriorityLevel): number {
  const fees: Record<PriorityLevel, number> = {
    none: 0,
    low: 1000, // 0.000001 SOL
    medium: 10000, // 0.00001 SOL
    high: 100000, // 0.0001 SOL
    turbo: 1000000, // 0.001 SOL
  }
  return fees[level]
}

/**
 * Add priority fee instruction
 */
export function addPriorityFee(
  instructions: TransactionInstruction[],
  level: PriorityLevel
): TransactionInstruction[] {
  if (level === 'none') {
    return instructions
  }

  const fee = getPriorityFee(level)
  const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: fee,
  })

  return [priorityIx, ...instructions]
}

/**
 * Add compute unit limit
 */
export function addComputeLimit(
  instructions: TransactionInstruction[],
  units: number
): TransactionInstruction[] {
  const limitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units,
  })

  return [limitIx, ...instructions]
}

/**
 * Estimate compute units for a transaction
 */
export async function estimateComputeUnits(
  connection: Connection,
  transaction: Transaction,
  _payer: PublicKey
): Promise<number> {
  try {
    const simulation = await connection.simulateTransaction(transaction)
    return simulation.value.unitsConsumed ?? 200000
  } catch {
    return 200000 // Default fallback
  }
}

/**
 * Get recent priority fees from network
 */
export async function getRecentPriorityFees(
  connection: Connection
): Promise<{ min: number; median: number; max: number }> {
  try {
    const fees = await connection.getRecentPrioritizationFees()

    if (fees.length === 0) {
      return { min: 0, median: 0, max: 0 }
    }

    const sorted = fees.map(f => f.prioritizationFee).sort((a, b) => a - b)
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const median = sorted[Math.floor(sorted.length / 2)]

    return { min, median, max }
  } catch {
    return { min: 0, median: 0, max: 0 }
  }
}

/**
 * Create optimized transaction
 */
export async function createOptimizedTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  options: TransactionOptions = {}
): Promise<Transaction> {
  let ixs = [...instructions]

  // Add priority fee
  if (options.priorityLevel && options.priorityLevel !== 'none') {
    ixs = addPriorityFee(ixs, options.priorityLevel)
  }

  // Add compute limit
  if (options.computeUnits) {
    ixs = addComputeLimit(ixs, options.computeUnits)
  }

  const transaction = new Transaction()
  transaction.add(...ixs)

  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = payer

  return transaction
}

/**
 * Create versioned transaction with lookup tables
 */
export async function createVersionedTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  lookupTables: AddressLookupTableAccount[] = []
): Promise<VersionedTransaction> {
  const { blockhash } = await connection.getLatestBlockhash()

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTables)

  return new VersionedTransaction(message)
}

/**
 * Pack multiple instructions into optimal transactions
 */
export function packInstructions(
  instructions: TransactionInstruction[],
  maxSize: number = 1232 // Max transaction size
): TransactionInstruction[][] {
  const batches: TransactionInstruction[][] = []
  let currentBatch: TransactionInstruction[] = []
  let currentSize = 0

  for (const ix of instructions) {
    // Rough size estimate
    const ixSize = 32 + ix.keys.length * 34 + ix.data.length

    if (currentSize + ixSize > maxSize && currentBatch.length > 0) {
      batches.push(currentBatch)
      currentBatch = []
      currentSize = 0
    }

    currentBatch.push(ix)
    currentSize += ixSize
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch)
  }

  return batches
}

/**
 * Send transaction with retry
 */
export async function sendWithRetry(
  connection: Connection,
  transaction: Transaction,
  options: {
    maxRetries?: number
    retryDelay?: number
    skipPreflight?: boolean
  } = {}
): Promise<string> {
  const { maxRetries = 3, retryDelay = 1000, skipPreflight = false } = options

  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight }
      )

      // Wait for confirmation
      await connection.confirmTransaction(signature)

      return signature
    } catch (error) {
      lastError = error as Error

      // Don't retry if it's a definitive failure
      if ((error as Error).message.includes('already processed')) {
        throw error
      }

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error('Transaction failed after retries')
}

/**
 * Wait for transaction confirmation with timeout
 */
export async function waitForConfirmation(
  connection: Connection,
  signature: string,
  timeout: number = 30000
): Promise<boolean> {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    const status = await connection.getSignatureStatus(signature)

    if (status.value?.confirmationStatus === 'confirmed' ||
        status.value?.confirmationStatus === 'finalized') {
      return true
    }

    if (status.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`)
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error('Transaction confirmation timeout')
}

/**
 * Get transaction cost estimate
 */
export async function estimateTransactionCost(
  connection: Connection,
  transaction: Transaction
): Promise<{ fee: number; rent: number; total: number }> {
  const fee = await transaction.getEstimatedFee(connection) ?? 5000

  // Estimate rent for new accounts (simplified)
  let rent = 0
  for (const ix of transaction.instructions) {
    // Check for account creation
    if (ix.programId.toBase58() === '11111111111111111111111111111111') {
      rent += 2039280 // Approximate rent for token account
    }
  }

  return {
    fee: fee / 1e9,
    rent: rent / 1e9,
    total: (fee + rent) / 1e9,
  }
}
