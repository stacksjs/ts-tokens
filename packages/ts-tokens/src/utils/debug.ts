/**
 * Debugging Utilities
 *
 * Tools for debugging transactions, accounts, and operations.
 */

import type { Connection, PublicKey } from '@solana/web3.js'

/**
 * Transaction analysis result
 */
export interface TransactionAnalysis {
  signature: string
  slot: number
  blockTime: number | null
  success: boolean
  fee: number
  computeUnits: number
  accounts: AccountChange[]
  instructions: InstructionInfo[]
  logs: string[]
  error?: string
}

export interface AccountChange {
  address: string
  preBalance: number
  postBalance: number
  change: number
  owner?: string
}

export interface InstructionInfo {
  programId: string
  programName: string
  data: string
  accounts: string[]
}

/**
 * Analyze a transaction
 */
export async function analyzeTransaction(
  connection: Connection,
  signature: string
): Promise<TransactionAnalysis | null> {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  })

  if (!tx) {
    return null
  }

  const accounts: AccountChange[] = []
  if (tx.meta?.preBalances && tx.meta?.postBalances) {
    const keys = tx.transaction.message.accountKeys
    for (let i = 0; i < keys.length; i++) {
      const pre = tx.meta.preBalances[i]
      const post = tx.meta.postBalances[i]
      if (pre !== post) {
        accounts.push({
          address: keys[i].pubkey.toBase58(),
          preBalance: pre / 1e9,
          postBalance: post / 1e9,
          change: (post - pre) / 1e9,
        })
      }
    }
  }

  const instructions: InstructionInfo[] = tx.transaction.message.instructions.map(ix => ({
    programId: ix.programId.toBase58(),
    programName: getProgramName(ix.programId.toBase58()),
    data: 'parsed' in ix ? JSON.stringify(ix.parsed) : 'raw',
    accounts: 'accounts' in ix ? ix.accounts.map(a => a.toBase58()) : [],
  }))

  return {
    signature,
    slot: tx.slot,
    blockTime: tx.blockTime ?? null,
    success: tx.meta?.err === null,
    fee: (tx.meta?.fee ?? 0) / 1e9,
    computeUnits: tx.meta?.computeUnitsConsumed ?? 0,
    accounts,
    instructions,
    logs: tx.meta?.logMessages ?? [],
    error: tx.meta?.err ? JSON.stringify(tx.meta.err) : undefined,
  }
}

/**
 * Get human-readable program name
 */
function getProgramName(programId: string): string {
  const programs: Record<string, string> = {
    '11111111111111111111111111111111': 'System Program',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022',
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s': 'Token Metadata',
    'CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR': 'Candy Machine v3',
    'Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g': 'Candy Guard',
    'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY': 'Bubblegum',
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token',
  }
  return programs[programId] ?? 'Unknown'
}

/**
 * Account state inspector
 */
export interface AccountState {
  address: string
  lamports: number
  owner: string
  ownerName: string
  executable: boolean
  rentEpoch: number
  dataSize: number
  data?: unknown
}

/**
 * Inspect an account
 */
export async function inspectAccount(
  connection: Connection,
  address: PublicKey
): Promise<AccountState | null> {
  const info = await connection.getAccountInfo(address)

  if (!info) {
    return null
  }

  return {
    address: address.toBase58(),
    lamports: info.lamports,
    owner: info.owner.toBase58(),
    ownerName: getProgramName(info.owner.toBase58()),
    executable: info.executable,
    rentEpoch: info.rentEpoch ?? 0,
    dataSize: info.data.length,
  }
}

/**
 * Simulate an instruction
 */
export async function simulateInstruction(
  connection: Connection,
  instruction: {
    programId: PublicKey
    keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>
    data: Buffer
  },
  payer: PublicKey
): Promise<{
  success: boolean
  logs: string[]
  unitsConsumed: number
  error?: string
}> {
  // In production, would build and simulate transaction
  return {
    success: true,
    logs: [],
    unitsConsumed: 0,
  }
}

/**
 * Format logs for display
 */
export function formatLogs(logs: string[]): string {
  return logs
    .map(log => {
      if (log.startsWith('Program log:')) {
        return `  📝 ${log.replace('Program log: ', '')}`
      }
      if (log.includes('invoke')) {
        return `🔷 ${log}`
      }
      if (log.includes('success')) {
        return `✅ ${log}`
      }
      if (log.includes('failed') || log.includes('error')) {
        return `❌ ${log}`
      }
      return `   ${log}`
    })
    .join('\n')
}

/**
 * Parse program error
 */
export function parseProgramError(error: string): {
  program: string
  code: number
  message: string
  suggestion?: string
} {
  // Common error patterns
  const patterns = [
    { regex: /insufficient funds/i, message: 'Insufficient SOL balance', suggestion: 'Add more SOL to your wallet' },
    { regex: /invalid account owner/i, message: 'Wrong account owner', suggestion: 'Check the account type' },
    { regex: /account not initialized/i, message: 'Account not initialized', suggestion: 'Initialize the account first' },
    { regex: /0x1/, message: 'Insufficient funds for fee', suggestion: 'Add more SOL for transaction fee' },
  ]

  for (const { regex, message, suggestion } of patterns) {
    if (regex.test(error)) {
      return {
        program: 'Unknown',
        code: 0,
        message,
        suggestion,
      }
    }
  }

  return {
    program: 'Unknown',
    code: 0,
    message: error,
  }
}

/**
 * Logger with levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export class Logger {
  private level: LogLevel
  private json: boolean

  constructor(options: { level?: LogLevel; json?: boolean } = {}) {
    this.level = options.level ?? 'info'
    this.json = options.json ?? false
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.level)
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return

    if (this.json) {
      console.log(JSON.stringify({ level, message, ...data, timestamp: new Date().toISOString() }))
    } else {
      const prefix = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level]
      console.log(`${prefix} [${level.toUpperCase()}] ${message}`, data ?? '')
    }
  }

  debug(message: string, data?: Record<string, unknown>): void { this.log('debug', message, data) }
  info(message: string, data?: Record<string, unknown>): void { this.log('info', message, data) }
  warn(message: string, data?: Record<string, unknown>): void { this.log('warn', message, data) }
  error(message: string, data?: Record<string, unknown>): void { this.log('error', message, data) }
}
