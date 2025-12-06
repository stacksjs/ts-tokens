/**
 * Transaction Simulation
 */

import type {
  Connection,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js'
import type { SimulationResult } from './types'
import {
  Transaction,
} from '@solana/web3.js'

/**
 * Simulate a transaction
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
): Promise<SimulationResult> {
  const result = await connection.simulateTransaction(
    transaction as VersionedTransaction,
    { sigVerify: false },
  )

  return {
    success: result.value.err === null,
    logs: result.value.logs ?? [],
    unitsConsumed: result.value.unitsConsumed ?? 0,
    error: result.value.err ? JSON.stringify(result.value.err) : undefined,
  }
}

/**
 * Simulate instructions
 */
export async function simulateInstructions(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
): Promise<SimulationResult> {
  const { blockhash } = await connection.getLatestBlockhash()

  const tx = new Transaction()
  tx.recentBlockhash = blockhash
  tx.feePayer = payer
  tx.add(...instructions)

  return simulateTransaction(connection, tx)
}

/**
 * Estimate compute units for transaction
 */
export async function estimateComputeUnits(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
): Promise<number> {
  const result = await simulateTransaction(connection, transaction)
  return result.unitsConsumed
}

/**
 * Estimate compute units for instructions
 */
export async function estimateInstructionComputeUnits(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
): Promise<number> {
  const result = await simulateInstructions(connection, instructions, payer)
  return result.unitsConsumed
}

/**
 * Check if transaction will succeed
 */
export async function willSucceed(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
): Promise<{ success: boolean, error?: string }> {
  const result = await simulateTransaction(connection, transaction)
  return {
    success: result.success,
    error: result.error,
  }
}

/**
 * Parse simulation logs
 */
export function parseSimulationLogs(logs: string[]): {
  programLogs: Map<string, string[]>
  errors: string[]
  warnings: string[]
} {
  const programLogs = new Map<string, string[]>()
  const errors: string[] = []
  const warnings: string[] = []

  let currentProgram = ''

  for (const log of logs) {
    // Program invocation
    if (log.startsWith('Program ') && log.includes(' invoke')) {
      const match = log.match(/Program (\w+) invoke/)
      if (match) {
        currentProgram = match[1]
        if (!programLogs.has(currentProgram)) {
          programLogs.set(currentProgram, [])
        }
      }
    }

    // Program log
    if (log.startsWith('Program log:')) {
      const message = log.replace('Program log: ', '')
      programLogs.get(currentProgram)?.push(message)

      if (message.toLowerCase().includes('error')) {
        errors.push(message)
      }
      if (message.toLowerCase().includes('warning')) {
        warnings.push(message)
      }
    }

    // Program error
    if (log.includes('failed:') || log.includes('Error:')) {
      errors.push(log)
    }
  }

  return { programLogs, errors, warnings }
}

/**
 * Format simulation result for display
 */
export function formatSimulationResult(result: SimulationResult): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════',
    'Simulation Result',
    '═══════════════════════════════════════════════════════════',
    '',
    `Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`,
    `Compute Units: ${result.unitsConsumed.toLocaleString()}`,
  ]

  if (result.error) {
    lines.push('', `Error: ${result.error}`)
  }

  if (result.logs.length > 0) {
    lines.push('', '─── Logs ───')
    for (const log of result.logs.slice(0, 30)) {
      lines.push(`  ${log}`)
    }
    if (result.logs.length > 30) {
      lines.push(`  ... and ${result.logs.length - 30} more`)
    }
  }

  return lines.join('\n')
}

/**
 * Dry run with detailed output
 */
export async function dryRun(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
  options: {
    showLogs?: boolean
    showAccounts?: boolean
  } = {},
): Promise<{
  success: boolean
  computeUnits: number
  logs?: string[]
  parsedLogs?: ReturnType<typeof parseSimulationLogs>
  error?: string
}> {
  const result = await simulateTransaction(connection, transaction)

  const output: ReturnType<typeof dryRun> extends Promise<infer T> ? T : never = {
    success: result.success,
    computeUnits: result.unitsConsumed,
    error: result.error,
  }

  if (options.showLogs) {
    output.logs = result.logs
    output.parsedLogs = parseSimulationLogs(result.logs)
  }

  return output
}

/**
 * Compare simulation results
 */
export function compareSimulations(
  sim1: SimulationResult,
  sim2: SimulationResult,
): {
  computeDiff: number
  bothSucceeded: boolean
  logDiff: number
} {
  return {
    computeDiff: sim1.unitsConsumed - sim2.unitsConsumed,
    bothSucceeded: sim1.success && sim2.success,
    logDiff: sim1.logs.length - sim2.logs.length,
  }
}
