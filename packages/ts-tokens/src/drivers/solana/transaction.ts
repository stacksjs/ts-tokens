/**
 * Solana Transaction Utilities
 *
 * Handles transaction building, sending, and confirmation.
 */

import {
  Transaction,
  Keypair,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js'
import type { SendOptions, TransactionSignature ,
  Connection,
  TransactionInstruction,
  PublicKey} from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions, SimulationResult } from '../../types'
import { retry, sleep } from '../../utils'
import { getLatestBlockhash } from './connection'
import { loadWallet } from './wallet'

/**
 * Resolve a named priority fee level to microlamports
 */
async function resolveNamedPriorityFee(
  connection: Connection,
  level: 'low' | 'medium' | 'high'
): Promise<number> {
  try {
    const recentFees = await connection.getRecentPrioritizationFees()
    if (recentFees.length === 0) {
      const defaults: Record<string, number> = { low: 1000, medium: 10000, high: 100000 }
      return defaults[level] ?? 10000
    }
    const fees = recentFees.map(f => f.prioritizationFee).sort((a, b) => a - b)
    const len = fees.length
    const percentiles: Record<string, number> = {
      low: fees[Math.floor(len * 0.25)],
      medium: fees[Math.floor(len * 0.5)],
      high: fees[Math.floor(len * 0.75)],
    }
    return percentiles[level] ?? 10000
  } catch {
    const defaults: Record<string, number> = { low: 1000, medium: 10000, high: 100000 }
    return defaults[level] ?? 10000
  }
}

/**
 * Build a transaction from instructions
 *
 * @param connection - Solana connection
 * @param instructions - Transaction instructions
 * @param payer - Fee payer public key
 * @param options - Transaction options
 * @returns Built transaction
 */
export async function buildTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  options?: TransactionOptions
): Promise<Transaction> {
  const { blockhash, lastValidBlockHeight } = await getLatestBlockhash(connection)

  const transaction = new Transaction({
    feePayer: payer,
    blockhash,
    lastValidBlockHeight,
  })

  // Add compute budget instructions if specified
  if (options?.computeUnits) {
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: options.computeUnits,
      })
    )
  }

  if (options?.priorityFee && options.priorityFee !== 'none') {
    const microLamports = typeof options.priorityFee === 'number'
      ? options.priorityFee
      : await resolveNamedPriorityFee(connection, options.priorityFee)
    if (microLamports > 0) {
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports,
        })
      )
    }
  }

  // Add all instructions
  for (const instruction of instructions) {
    transaction.add(instruction)
  }

  return transaction
}

/**
 * Send and confirm a transaction
 *
 * @param connection - Solana connection
 * @param transaction - Signed transaction
 * @param options - Send options
 * @returns Transaction result
 */
export async function sendAndConfirmTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
  options?: TransactionOptions
): Promise<TransactionResult> {
  // Dry-run mode: simulate instead of sending
  if (options?.dryRun) {
    try {
      let simResult
      if (transaction instanceof Transaction) {
        simResult = await connection.simulateTransaction(transaction)
      } else {
        simResult = await connection.simulateTransaction(transaction)
      }

      return {
        signature: 'DRY_RUN',
        confirmed: false,
        computeUnitsConsumed: simResult.value.unitsConsumed ?? undefined,
        logs: simResult.value.logs ?? undefined,
        error: simResult.value.err ? JSON.stringify(simResult.value.err) : undefined,
      }
    } catch (error) {
      return {
        signature: 'DRY_RUN',
        confirmed: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  const sendOptions: SendOptions = {
    skipPreflight: options?.skipPreflight ?? false,
    preflightCommitment: options?.commitment ?? 'confirmed',
    maxRetries: options?.maxRetries ?? 3,
  }

  let signature: TransactionSignature

  try {
    if (transaction instanceof Transaction) {
      signature = await connection.sendRawTransaction(
        transaction.serialize(),
        sendOptions
      )
    } else {
      signature = await connection.sendRawTransaction(
        transaction.serialize(),
        sendOptions
      )
    }
  } catch (error) {
    return {
      signature: '',
      confirmed: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // Wait for confirmation
  try {
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: transaction instanceof Transaction
          ? transaction.recentBlockhash!
          : '', // For versioned transactions, we'd need to extract this differently
        lastValidBlockHeight: transaction instanceof Transaction
          ? transaction.lastValidBlockHeight!
          : 0,
      },
      options?.commitment ?? 'confirmed'
    )

    if (confirmation.value.err) {
      return {
        signature,
        confirmed: false,
        error: JSON.stringify(confirmation.value.err),
      }
    }

    // Get transaction details
    const txInfo = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })

    return {
      signature,
      confirmed: true,
      slot: txInfo?.slot,
      blockTime: txInfo?.blockTime ?? undefined,
      computeUnitsConsumed: txInfo?.meta?.computeUnitsConsumed,
      fee: txInfo?.meta?.fee,
      logs: txInfo?.meta?.logMessages ?? undefined,
    }
  } catch (error) {
    return {
      signature,
      confirmed: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Send transaction with retry
 *
 * @param connection - Solana connection
 * @param transaction - Signed transaction
 * @param options - Transaction options
 * @returns Transaction result
 */
export async function sendTransactionWithRetry(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const maxRetries = options?.maxRetries ?? 3

  return retry(
    () => sendAndConfirmTransaction(connection, transaction, options),
    maxRetries,
    1000
  )
}

/**
 * Simulate a transaction
 *
 * @param connection - Solana connection
 * @param transaction - Transaction to simulate
 * @returns Simulation result
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction
): Promise<SimulationResult> {
  try {
    let result

    if (transaction instanceof Transaction) {
      result = await connection.simulateTransaction(transaction)
    } else {
      result = await connection.simulateTransaction(transaction)
    }

    return {
      success: result.value.err === null,
      error: result.value.err ? JSON.stringify(result.value.err) : undefined,
      logs: result.value.logs ?? [],
      unitsConsumed: result.value.unitsConsumed ?? 0,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs: [],
      unitsConsumed: 0,
    }
  }
}

/**
 * Get transaction status
 *
 * @param connection - Solana connection
 * @param signature - Transaction signature
 * @returns Transaction status
 */
export async function getTransactionStatus(
  connection: Connection,
  signature: string
): Promise<{ confirmed: boolean; slot?: number; error?: string }> {
  try {
    const status = await connection.getSignatureStatus(signature)

    if (!status.value) {
      return { confirmed: false }
    }

    if (status.value.err) {
      return {
        confirmed: false,
        error: JSON.stringify(status.value.err),
      }
    }

    return {
      confirmed: status.value.confirmationStatus === 'confirmed' ||
                 status.value.confirmationStatus === 'finalized',
      slot: status.value.slot,
    }
  } catch (error) {
    return {
      confirmed: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Wait for transaction confirmation
 *
 * @param connection - Solana connection
 * @param signature - Transaction signature
 * @param timeout - Timeout in milliseconds
 * @returns Whether transaction was confirmed
 */
export async function waitForConfirmation(
  connection: Connection,
  signature: string,
  timeout: number = 30000
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const status = await getTransactionStatus(connection, signature)

    if (status.confirmed) {
      return true
    }

    if (status.error) {
      throw new Error(`Transaction failed: ${status.error}`)
    }

    await sleep(500)
  }

  throw new Error('Transaction confirmation timeout')
}

/**
 * Estimate priority fee based on recent transactions
 *
 * @param connection - Solana connection
 * @returns Priority fee estimates in microlamports
 */
export async function estimatePriorityFee(
  connection: Connection
): Promise<{ min: number; low: number; medium: number; high: number; veryHigh: number }> {
  try {
    const recentFees = await connection.getRecentPrioritizationFees()

    if (recentFees.length === 0) {
      return {
        min: 0,
        low: 1000,
        medium: 10000,
        high: 100000,
        veryHigh: 1000000,
      }
    }

    const fees = recentFees.map(f => f.prioritizationFee).sort((a, b) => a - b)
    const len = fees.length

    return {
      min: fees[0],
      low: fees[Math.floor(len * 0.25)],
      medium: fees[Math.floor(len * 0.5)],
      high: fees[Math.floor(len * 0.75)],
      veryHigh: fees[Math.floor(len * 0.95)],
    }
  } catch {
    return {
      min: 0,
      low: 1000,
      medium: 10000,
      high: 100000,
      veryHigh: 1000000,
    }
  }
}

/**
 * Create a versioned transaction
 *
 * @param connection - Solana connection
 * @param instructions - Transaction instructions
 * @param payer - Fee payer
 * @param lookupTables - Address lookup tables
 * @returns Versioned transaction
 */
export async function createVersionedTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  lookupTables?: PublicKey[]
): Promise<VersionedTransaction> {
  const { blockhash } = await getLatestBlockhash(connection)

  // Fetch lookup table accounts if provided
  const lookupTableAccounts = lookupTables
    ? await Promise.all(
        lookupTables.map(async (address) => {
          const account = await connection.getAddressLookupTable(address)
          return account.value
        })
      )
    : []

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTableAccounts.filter(Boolean) as any)

  return new VersionedTransaction(message)
}
