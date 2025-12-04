/**
 * Debug Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Transaction analysis result
 */
export interface TransactionAnalysis {
  signature: string
  slot: number
  blockTime: number
  status: 'success' | 'failed'
  fee: number
  computeUnits: number
  accounts: AccountChange[]
  instructions: InstructionInfo[]
  logs: string[]
  error?: string
}

/**
 * Account change in transaction
 */
export interface AccountChange {
  address: PublicKey
  preBalance: bigint
  postBalance: bigint
  change: bigint
  owner?: PublicKey
  isWritable: boolean
  isSigner: boolean
}

/**
 * Instruction info
 */
export interface InstructionInfo {
  programId: PublicKey
  programName: string
  instructionName?: string
  accounts: PublicKey[]
  data: Uint8Array
  decodedData?: Record<string, unknown>
  innerInstructions?: InstructionInfo[]
}

/**
 * Account inspection result
 */
export interface AccountInspection {
  address: PublicKey
  lamports: bigint
  owner: PublicKey
  executable: boolean
  rentEpoch: number
  dataLength: number
  accountType?: string
  parsedData?: Record<string, unknown>
}

/**
 * Simulation result
 */
export interface SimulationResult {
  success: boolean
  logs: string[]
  unitsConsumed: number
  returnData?: {
    programId: PublicKey
    data: Uint8Array
  }
  error?: string
  accountChanges?: AccountChange[]
}

/**
 * Known program IDs
 */
export const KNOWN_PROGRAMS: Record<string, string> = {
  '11111111111111111111111111111111': 'System Program',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022 Program',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Program',
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s': 'Token Metadata Program',
  'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY': 'Bubblegum Program',
  'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK': 'Compression Program',
  'CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR': 'Candy Machine V3',
  'Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g': 'Candy Guard',
}

/**
 * Debug options
 */
export interface DebugOptions {
  verbose?: boolean
  showLogs?: boolean
  showAccounts?: boolean
  showInstructions?: boolean
  decodeData?: boolean
}
