/**
 * Jupiter Limit Orders
 *
 * Create, cancel, and query limit orders via Jupiter Limit Order API.
 */

import { VersionedTransaction } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { sendAndConfirmTransaction } from '../drivers/solana/transaction'

// The limit-order v2 API was superseded by the Jupiter Trigger API.
const JUPITER_LIMIT_API = 'https://api.jup.ag/trigger/v1'

/**
 * Limit order
 */
export interface LimitOrder {
  publicKey: string
  account: {
    maker: string
    inputMint: string
    outputMint: string
    oriMakingAmount: string
    oriTakingAmount: string
    makingAmount: string
    takingAmount: string
    borrowMakingAmount: string
    expiredAt: number | null
    createdAt: number
    updatedAt: number
  }
}

/**
 * Options for creating a limit order
 */
export interface CreateLimitOrderOptions {
  inputMint: string
  outputMint: string
  makingAmount: bigint
  takingAmount: bigint
  expireAt?: number
}

/**
 * Create a limit order
 */
export async function createLimitOrder(
  options: CreateLimitOrderOptions,
  config: TokenConfig
): Promise<{ signature: string; orderPubkey: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const response = await fetch(`${JUPITER_LIMIT_API}/createOrder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      maker: payer.publicKey.toBase58(),
      payer: payer.publicKey.toBase58(),
      inputMint: options.inputMint,
      outputMint: options.outputMint,
      params: {
        makingAmount: options.makingAmount.toString(),
        takingAmount: options.takingAmount.toString(),
        ...(options.expireAt !== undefined ? { expiredAt: options.expireAt.toString() } : {}),
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Jupiter Limit Order API error: ${response.statusText}`)
  }

  const data = await response.json()
  // Trigger API returns a base64 VersionedTransaction; legacy Transaction.from
  // throws on the versioned prefix.
  const transaction = VersionedTransaction.deserialize(
    Buffer.from(data.transaction ?? data.tx, 'base64')
  )

  transaction.sign([payer])

  const result = await sendAndConfirmTransaction(connection, transaction)

  return {
    signature: result.signature,
    orderPubkey: data.order ?? data.orderPubkey ?? '',
  }
}

/**
 * Cancel one or more limit orders
 */
export async function cancelLimitOrders(
  orderPubkeys: string[],
  config: TokenConfig
): Promise<{ signatures: string[] }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const response = await fetch(`${JUPITER_LIMIT_API}/cancelOrders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      maker: payer.publicKey.toBase58(),
      orders: orderPubkeys,
    }),
  })

  if (!response.ok) {
    throw new Error(`Jupiter cancel orders error: ${response.statusText}`)
  }

  const data = await response.json()
  const signatures: string[] = []

  const txs = data.transactions ?? data.txs ?? [data.transaction ?? data.tx].filter(Boolean)
  for (const txData of txs) {
    const transaction = VersionedTransaction.deserialize(Buffer.from(txData, 'base64'))
    transaction.sign([payer])
    const result = await sendAndConfirmTransaction(connection, transaction)
    signatures.push(result.signature)
  }

  return { signatures }
}

/**
 * Get open limit orders for a wallet
 */
export async function getOpenLimitOrders(
  wallet: string
): Promise<LimitOrder[]> {
  const response = await fetch(
    `${JUPITER_LIMIT_API}/getTriggerOrders?user=${wallet}&orderStatus=active`
  )

  if (!response.ok) {
    throw new Error(`Jupiter open orders error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.orders ?? data ?? []
}

/**
 * Get order history for a wallet
 */
export async function getLimitOrderHistory(
  wallet: string,
  options: { page?: number; take?: number } = {}
): Promise<LimitOrder[]> {
  const { page = 1 } = options

  const response = await fetch(
    `${JUPITER_LIMIT_API}/getTriggerOrders?user=${wallet}&orderStatus=history&page=${page}`
  )

  if (!response.ok) {
    throw new Error(`Jupiter order history error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.orders ?? data ?? []
}

/**
 * Calculate the taking amount for a desired price
 */
export function calculateTakingAmount(
  makingAmount: bigint,
  price: number,
  makingDecimals: number,
  takingDecimals: number
): bigint {
  const makingFloat = Number(makingAmount) / Math.pow(10, makingDecimals)
  const takingFloat = makingFloat * price
  return BigInt(Math.floor(takingFloat * Math.pow(10, takingDecimals)))
}

/**
 * Format a limit order for display
 */
export function formatLimitOrder(order: LimitOrder): string {
  const { account } = order
  const makingAmountNum = Number(account.makingAmount)
  const takingAmountNum = Number(account.takingAmount)
  const _price = takingAmountNum > 0 ? makingAmountNum / takingAmountNum : 0

  return [
    `Order: ${order.publicKey}`,
    `  Input: ${account.inputMint}`,
    `  Output: ${account.outputMint}`,
    `  Making: ${account.makingAmount} / ${account.oriMakingAmount}`,
    `  Taking: ${account.takingAmount} / ${account.oriTakingAmount}`,
    `  Filled: ${((1 - makingAmountNum / Number(account.oriMakingAmount)) * 100).toFixed(1)}%`,
    account.expiredAt ? `  Expires: ${new Date(account.expiredAt * 1000).toISOString()}` : '  No expiry',
    `  Created: ${new Date(account.createdAt * 1000).toISOString()}`,
  ].join('\n')
}
