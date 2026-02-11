/**
 * Transaction Debugging
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type {
  TransactionAnalysis,
  AccountChange,
  InstructionInfo,
  DebugOptions,
  KNOWN_PROGRAMS,
} from './types'

/**
 * Analyze a transaction by signature
 */
export async function analyzeTransaction(
  connection: Connection,
  signature: string,
  options: DebugOptions = {}
): Promise<TransactionAnalysis> {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  })

  if (!tx) {
    throw new Error(`Transaction not found: ${signature}`)
  }

  const { meta, slot, blockTime } = tx

  // Parse account changes
  const accounts: AccountChange[] = []
  if (meta && tx.transaction.message.staticAccountKeys) {
    const keys = tx.transaction.message.staticAccountKeys
    for (let i = 0; i < keys.length; i++) {
      const preBalance = BigInt(meta.preBalances[i])
      const postBalance = BigInt(meta.postBalances[i])

      accounts.push({
        address: keys[i],
        preBalance,
        postBalance,
        change: postBalance - preBalance,
        isWritable: tx.transaction.message.isAccountWritable(i),
        isSigner: tx.transaction.message.isAccountSigner(i),
      })
    }
  }

  // Parse instructions
  const instructions: InstructionInfo[] = []
  const compiledInstructions = tx.transaction.message.compiledInstructions
  const keys = tx.transaction.message.staticAccountKeys

  for (const ix of compiledInstructions) {
    const programId = keys[ix.programIdIndex]
    instructions.push({
      programId,
      programName: getProgramName(programId),
      accounts: ix.accountKeyIndexes.map(i => keys[i]),
      data: ix.data,
    })
  }

  return {
    signature,
    slot,
    blockTime: blockTime ?? 0,
    status: meta?.err ? 'failed' : 'success',
    fee: meta?.fee ?? 0,
    computeUnits: meta?.computeUnitsConsumed ?? 0,
    accounts,
    instructions,
    logs: meta?.logMessages ?? [],
    error: meta?.err ? JSON.stringify(meta.err) : undefined,
  }
}

/**
 * Get program name from ID
 */
export function getProgramName(programId: PublicKey): string {
  const knownPrograms: Record<string, string> = {
    '11111111111111111111111111111111': 'System Program',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022 Program',
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Program',
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s': 'Token Metadata Program',
  }

  return knownPrograms[programId.toBase58()] ?? 'Unknown Program'
}

/**
 * Format transaction analysis for display
 */
export function formatTransactionAnalysis(analysis: TransactionAnalysis): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════',
    `Transaction: ${analysis.signature}`,
    '═══════════════════════════════════════════════════════════',
    '',
    `Status: ${analysis.status.toUpperCase()}`,
    `Slot: ${analysis.slot}`,
    `Block Time: ${new Date(analysis.blockTime * 1000).toISOString()}`,
    `Fee: ${analysis.fee / 1e9} SOL`,
    `Compute Units: ${analysis.computeUnits.toLocaleString()}`,
  ]

  if (analysis.error) {
    lines.push('', `Error: ${analysis.error}`)
  }

  // Account changes
  lines.push('', '─── Account Changes ───')
  for (const acc of analysis.accounts) {
    if (acc.change !== 0n) {
      const change = Number(acc.change) / 1e9
      const sign = change > 0 ? '+' : ''
      lines.push(`  ${acc.address.toBase58().slice(0, 8)}...: ${sign}${change.toFixed(9)} SOL`)
    }
  }

  // Instructions
  lines.push('', '─── Instructions ───')
  for (let i = 0; i < analysis.instructions.length; i++) {
    const ix = analysis.instructions[i]
    lines.push(`  ${i + 1}. ${ix.programName}`)
    if (ix.instructionName) {
      lines.push(`     Instruction: ${ix.instructionName}`)
    }
  }

  // Logs
  if (analysis.logs.length > 0) {
    lines.push('', '─── Logs ───')
    for (const log of analysis.logs.slice(0, 20)) {
      lines.push(`  ${log}`)
    }
    if (analysis.logs.length > 20) {
      lines.push(`  ... and ${analysis.logs.length - 20} more`)
    }
  }

  return lines.join('\n')
}

/**
 * Get transaction history for address
 */
export async function getTransactionHistory(
  connection: Connection,
  address: PublicKey,
  limit: number = 10
): Promise<TransactionAnalysis[]> {
  const signatures = await connection.getSignaturesForAddress(address, { limit })

  const analyses: TransactionAnalysis[] = []
  for (const sig of signatures) {
    try {
      const analysis = await analyzeTransaction(connection, sig.signature)
      analyses.push(analysis)
    } catch {
      // Skip failed fetches
    }
  }

  return analyses
}

/**
 * Compare two transactions
 */
export function compareTransactions(
  tx1: TransactionAnalysis,
  tx2: TransactionAnalysis
): {
  feeDiff: number
  computeDiff: number
  accountDiffs: Array<{ address: string; diff1: bigint; diff2: bigint }>
} {
  const accountDiffs: Array<{ address: string; diff1: bigint; diff2: bigint }> = []

  const tx1Accounts = new Map(tx1.accounts.map(a => [a.address.toBase58(), a.change]))
  const tx2Accounts = new Map(tx2.accounts.map(a => [a.address.toBase58(), a.change]))

  const allAddresses = new Set([...tx1Accounts.keys(), ...tx2Accounts.keys()])

  for (const addr of allAddresses) {
    const diff1 = tx1Accounts.get(addr) ?? 0n
    const diff2 = tx2Accounts.get(addr) ?? 0n
    if (diff1 !== diff2) {
      accountDiffs.push({ address: addr, diff1, diff2 })
    }
  }

  return {
    feeDiff: tx1.fee - tx2.fee,
    computeDiff: tx1.computeUnits - tx2.computeUnits,
    accountDiffs,
  }
}
