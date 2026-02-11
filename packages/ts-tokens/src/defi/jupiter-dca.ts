/**
 * Jupiter DCA (Dollar-Cost Averaging)
 *
 * Create, close, and query DCA positions via Jupiter DCA API.
 */

import { PublicKey, Transaction } from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { sendAndConfirmTransaction } from '../drivers/solana/transaction'

const JUPITER_DCA_API = 'https://dca-api.jup.ag'

/**
 * DCA position
 */
export interface DCAPosition {
  publicKey: string
  user: string
  inputMint: string
  outputMint: string
  inDeposited: string
  inWithdrawn: string
  outWithdrawn: string
  inUsed: string
  inAmountPerCycle: string
  cycleFrequency: number
  nextCycleAt: number
  createdAt: number
  minOutAmount: string
  maxOutAmount: string
  keeperInBalanceBeforeBorrow: string
  dcaOutBalanceBeforeSwap: string
  userClosed: boolean
}

/**
 * Options for creating a DCA position
 */
export interface CreateDCAOptions {
  inputMint: string
  outputMint: string
  totalInAmount: bigint
  inAmountPerCycle: bigint
  cycleFrequency: number
  minPrice?: number
  maxPrice?: number
  startAt?: number
}

/**
 * Create a DCA position
 */
export async function createDCA(
  options: CreateDCAOptions,
  config: TokenConfig
): Promise<{ signature: string; dcaPubkey: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const body: Record<string, unknown> = {
    user: payer.publicKey.toBase58(),
    payer: payer.publicKey.toBase58(),
    inputMint: options.inputMint,
    outputMint: options.outputMint,
    totalInAmount: options.totalInAmount.toString(),
    inAmountPerCycle: options.inAmountPerCycle.toString(),
    cycleSecondsApart: options.cycleFrequency,
  }

  if (options.minPrice !== undefined) {
    body.minOutAmountPerCycle = options.minPrice.toString()
  }
  if (options.maxPrice !== undefined) {
    body.maxOutAmountPerCycle = options.maxPrice.toString()
  }
  if (options.startAt !== undefined) {
    body.startAt = options.startAt
  }

  const response = await fetch(`${JUPITER_DCA_API}/v1/dca/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Jupiter DCA API error: ${response.statusText}`)
  }

  const data = await response.json()
  const transaction = Transaction.from(Buffer.from(data.tx, 'base64'))

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return {
    signature: result.signature,
    dcaPubkey: data.dcaPubkey ?? '',
  }
}

/**
 * Close a DCA position
 */
export async function closeDCA(
  dcaPubkey: string,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const response = await fetch(`${JUPITER_DCA_API}/v1/dca/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: payer.publicKey.toBase58(),
      dca: dcaPubkey,
    }),
  })

  if (!response.ok) {
    throw new Error(`Jupiter DCA close error: ${response.statusText}`)
  }

  const data = await response.json()
  const transaction = Transaction.from(Buffer.from(data.tx, 'base64'))

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return { signature: result.signature }
}

/**
 * Get all DCA positions for a user
 */
export async function getDCAPositions(
  wallet: string
): Promise<DCAPosition[]> {
  const response = await fetch(
    `${JUPITER_DCA_API}/v1/user/${wallet}/dcas`
  )

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data.dcas ?? data ?? []
}

/**
 * Get a specific DCA position
 */
export async function getDCAPosition(
  dcaPubkey: string
): Promise<DCAPosition | null> {
  const response = await fetch(
    `${JUPITER_DCA_API}/v1/dca/${dcaPubkey}`
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}

/**
 * Calculate DCA execution details
 */
export function calculateDCADetails(options: CreateDCAOptions): {
  totalCycles: number
  estimatedDuration: number
  amountPerCycle: bigint
} {
  const totalCycles = Number(options.totalInAmount / options.inAmountPerCycle)
  const estimatedDuration = totalCycles * options.cycleFrequency

  return {
    totalCycles,
    estimatedDuration,
    amountPerCycle: options.inAmountPerCycle,
  }
}

/**
 * Format a DCA position for display
 */
export function formatDCAPosition(position: DCAPosition): string {
  const deposited = BigInt(position.inDeposited)
  const used = BigInt(position.inUsed)
  const remaining = deposited - used
  const progress = deposited > 0n ? Number(used * 100n / deposited) : 0

  return [
    `DCA: ${position.publicKey}`,
    `  Input: ${position.inputMint}`,
    `  Output: ${position.outputMint}`,
    `  Deposited: ${position.inDeposited}`,
    `  Used: ${position.inUsed} (${progress}%)`,
    `  Remaining: ${remaining.toString()}`,
    `  Per Cycle: ${position.inAmountPerCycle}`,
    `  Cycle Freq: ${position.cycleFrequency}s`,
    `  Next Cycle: ${new Date(position.nextCycleAt * 1000).toISOString()}`,
    `  Status: ${position.userClosed ? 'Closed' : 'Active'}`,
  ].join('\n')
}
