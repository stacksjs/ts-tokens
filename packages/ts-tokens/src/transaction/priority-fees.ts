/**
 * Priority Fee Estimation & Management
 *
 * Provides priority fee estimation via Helius API and standard RPC,
 * with helpers to add priority fees to any transaction.
 */

import { ComputeBudgetProgram } from '@solana/web3.js'
import type { Connection, TransactionInstruction } from '@solana/web3.js'
import type { PriorityFeeEstimate } from '../types/transaction'

/**
 * Priority fee level presets
 */
export type PriorityFeeLevel = 'none' | 'low' | 'medium' | 'high' | 'veryHigh'

/**
 * Priority fee configuration
 */
export interface PriorityFeeConfig {
  defaultLevel?: PriorityFeeLevel
  heliusApiKey?: string
  maxFee?: number
}

/**
 * Get priority fee estimate using Helius enhanced API
 */
export async function getPriorityFeeEstimateHelius(
  rpcUrl: string,
  options: {
    accountKeys?: string[]
    transactionEncoded?: string
  } = {}
): Promise<PriorityFeeEstimate> {
  try {
    const params: Record<string, unknown> = {}

    if (options.transactionEncoded) {
      params.transaction = options.transactionEncoded
    } else if (options.accountKeys?.length) {
      params.accountKeys = options.accountKeys
    }

    params.options = {
      includeAllPriorityFeeLevels: true,
    }

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'priority-fee-estimate',
        method: 'getPriorityFeeEstimate',
        params: [params],
      }),
    })

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`Helius RPC error: ${data.error.message}`)
    }

    const levels = data.result?.priorityFeeLevels
    if (levels) {
      return {
        min: Math.floor(levels.min ?? 0),
        low: Math.floor(levels.low ?? 1000),
        medium: Math.floor(levels.medium ?? 10000),
        high: Math.floor(levels.high ?? 100000),
        veryHigh: Math.floor(levels.veryHigh ?? 1000000),
      }
    }

    // Fallback to single estimate
    return {
      min: 0,
      low: Math.floor(data.result?.priorityFeeEstimate ?? 1000),
      medium: Math.floor((data.result?.priorityFeeEstimate ?? 10000) * 2),
      high: Math.floor((data.result?.priorityFeeEstimate ?? 100000) * 5),
      veryHigh: Math.floor((data.result?.priorityFeeEstimate ?? 1000000) * 10),
    }
  } catch {
    return getDefaultFeeEstimate()
  }
}

/**
 * Get priority fee estimate using standard RPC (getRecentPrioritizationFees)
 */
export async function getPriorityFeeEstimateRpc(
  connection: Connection,
  accountKeys?: string[]
): Promise<PriorityFeeEstimate> {
  try {
    const recentFees = await connection.getRecentPrioritizationFees()

    if (recentFees.length === 0) {
      return getDefaultFeeEstimate()
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
    return getDefaultFeeEstimate()
  }
}

/**
 * Get priority fee estimate (auto-selects Helius or standard RPC)
 */
export async function getPriorityFeeEstimate(
  connection: Connection,
  options: {
    rpcUrl?: string
    accountKeys?: string[]
  } = {}
): Promise<PriorityFeeEstimate> {
  // Try Helius first if the RPC URL looks like a Helius endpoint
  if (options.rpcUrl?.includes('helius')) {
    return getPriorityFeeEstimateHelius(options.rpcUrl, {
      accountKeys: options.accountKeys,
    })
  }

  // Fall back to standard RPC
  return getPriorityFeeEstimateRpc(connection, options.accountKeys)
}

/**
 * Resolve a priority fee level or explicit value to microlamports
 */
export async function resolvePriorityFee(
  connection: Connection,
  fee: PriorityFeeLevel | number,
  rpcUrl?: string
): Promise<number> {
  if (typeof fee === 'number') {
    return fee
  }

  if (fee === 'none') {
    return 0
  }

  const estimate = await getPriorityFeeEstimate(connection, { rpcUrl })
  return estimate[fee]
}

/**
 * Create compute budget instructions for priority fees
 */
export function createPriorityFeeInstructions(
  microLamports: number,
  computeUnits?: number
): TransactionInstruction[] {
  const instructions: TransactionInstruction[] = []

  if (computeUnits) {
    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits })
    )
  }

  if (microLamports > 0) {
    instructions.push(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
    )
  }

  return instructions
}

/**
 * Get default fee estimates when API calls fail
 */
function getDefaultFeeEstimate(): PriorityFeeEstimate {
  return {
    min: 0,
    low: 1000,
    medium: 10000,
    high: 100000,
    veryHigh: 1000000,
  }
}
