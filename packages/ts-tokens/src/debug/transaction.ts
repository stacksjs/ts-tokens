/**
 * Transaction Debugging
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type {
  TransactionAnalysis,
  AccountChange,
  InstructionInfo,
  DebugOptions,
} from './types'
import { KNOWN_PROGRAMS } from './types'

/**
 * Analyze a transaction by signature
 */
export async function analyzeTransaction(
  connection: Connection,
  signature: string,
  _options: DebugOptions = {}
): Promise<TransactionAnalysis> {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  })

  if (!tx) {
    throw new Error(`Transaction not found: ${signature}`)
  }

  const { meta, slot, blockTime } = tx
  const message = tx.transaction.message

  // Build the full ordered account-key list: static keys first, then loaded
  // writable, then loaded readonly (as required by v0 address-lookup-tables).
  // Indexes in compiled instructions and balances refer to this combined list.
  const staticKeys = message.staticAccountKeys
  const loadedWritable = meta?.loadedAddresses?.writable ?? []
  const loadedReadonly = meta?.loadedAddresses?.readonly ?? []
  const keys: PublicKey[] = [...staticKeys, ...loadedWritable, ...loadedReadonly]

  // Parse account changes
  const accounts: AccountChange[] = []
  if (meta) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (!key) continue

      const preBalance = BigInt(meta.preBalances[i] ?? 0)
      const postBalance = BigInt(meta.postBalances[i] ?? 0)

      accounts.push({
        address: key,
        preBalance,
        postBalance,
        change: postBalance - preBalance,
        isWritable: message.isAccountWritable(i),
        isSigner: message.isAccountSigner(i),
      })
    }
  }

  // Parse instructions
  const instructions: InstructionInfo[] = []
  const compiledInstructions = message.compiledInstructions

  for (const ix of compiledInstructions) {
    const programId = keys[ix.programIdIndex]
    if (!programId) continue

    instructions.push({
      programId,
      programName: getProgramName(programId),
      accounts: ix.accountKeyIndexes.map(i => keys[i]).filter(k => k !== undefined),
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
  return KNOWN_PROGRAMS[programId.toBase58()] ?? 'Unknown Program'
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
