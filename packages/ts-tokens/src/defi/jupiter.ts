/**
 * Jupiter Integration
 *
 * Swap aggregator integration for token swaps.
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey, Transaction } from '@solana/web3.js'
import type { SwapQuote, SwapOptions, TokenPrice } from './types'

const JUPITER_API = 'https://quote-api.jup.ag/v6'

/**
 * Get swap quote from Jupiter
 */
export async function getSwapQuote(options: SwapOptions): Promise<SwapQuote> {
  const {
    inputMint,
    outputMint,
    amount,
    slippageBps = 50,
    onlyDirectRoutes = false,
  } = options

  const params = new URLSearchParams({
    inputMint: inputMint.toBase58(),
    outputMint: outputMint.toBase58(),
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
    onlyDirectRoutes: onlyDirectRoutes.toString(),
  })

  const response = await fetch(`${JUPITER_API}/quote?${params}`)

  if (!response.ok) {
    throw new Error(`Jupiter API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    inputMint,
    outputMint,
    inputAmount: BigInt(data.inAmount),
    outputAmount: BigInt(data.outAmount),
    priceImpact: data.priceImpactPct,
    fee: BigInt(data.platformFee?.amount ?? 0),
    route: data.routePlan?.map((leg: { swapInfo: { ammKey: string; inputMint: string; outputMint: string; inAmount: string; outAmount: string }; label: string }) => ({
      protocol: leg.label,
      inputMint: new PublicKey(leg.swapInfo.inputMint),
      outputMint: new PublicKey(leg.swapInfo.outputMint),
      inputAmount: BigInt(leg.swapInfo.inAmount),
      outputAmount: BigInt(leg.swapInfo.outAmount),
      poolAddress: new PublicKey(leg.swapInfo.ammKey),
    })) ?? [],
    expiresAt: Date.now() + 30000, // 30 seconds
  }
}

/**
 * Build swap transaction from quote
 */
export async function buildSwapTransaction(
  quote: SwapQuote,
  userPublicKey: PublicKey
): Promise<Transaction> {
  const response = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: {
        inputMint: quote.inputMint.toBase58(),
        outputMint: quote.outputMint.toBase58(),
        inAmount: quote.inputAmount.toString(),
        outAmount: quote.outputAmount.toString(),
        priceImpactPct: quote.priceImpact,
      },
      userPublicKey: userPublicKey.toBase58(),
      wrapAndUnwrapSol: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Jupiter swap API error: ${response.statusText}`)
  }

  const data = await response.json()
  const swapTransaction = Buffer.from(data.swapTransaction, 'base64')

  return Transaction.from(swapTransaction)
}

/**
 * Execute a swap
 */
export async function executeSwap(
  connection: Connection,
  options: SwapOptions,
  userPublicKey: PublicKey
): Promise<{ quote: SwapQuote; transaction: Transaction }> {
  const quote = await getSwapQuote(options)
  const transaction = await buildSwapTransaction(quote, userPublicKey)

  return { quote, transaction }
}

/**
 * Get token price from Jupiter
 */
export async function getTokenPrice(mint: PublicKey): Promise<TokenPrice> {
  const response = await fetch(
    `https://price.jup.ag/v4/price?ids=${mint.toBase58()}`
  )

  if (!response.ok) {
    throw new Error(`Jupiter price API error: ${response.statusText}`)
  }

  const data = await response.json()
  const priceData = data.data[mint.toBase58()]

  if (!priceData) {
    throw new Error(`Price not found for ${mint.toBase58()}`)
  }

  return {
    mint,
    priceUsd: priceData.price,
    priceChange24h: 0, // Not available in this endpoint
    volume24h: 0,
    source: 'jupiter',
    timestamp: Date.now(),
  }
}

/**
 * Get multiple token prices
 */
export async function getTokenPrices(mints: PublicKey[]): Promise<Map<string, TokenPrice>> {
  const ids = mints.map(m => m.toBase58()).join(',')
  const response = await fetch(`https://price.jup.ag/v4/price?ids=${ids}`)

  if (!response.ok) {
    throw new Error(`Jupiter price API error: ${response.statusText}`)
  }

  const data = await response.json()
  const prices = new Map<string, TokenPrice>()

  for (const mint of mints) {
    const address = mint.toBase58()
    const priceData = data.data[address]

    if (priceData) {
      prices.set(address, {
        mint,
        priceUsd: priceData.price,
        priceChange24h: 0,
        volume24h: 0,
        source: 'jupiter',
        timestamp: Date.now(),
      })
    }
  }

  return prices
}

/**
 * Get supported tokens
 */
export async function getSupportedTokens(): Promise<Array<{
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}>> {
  const response = await fetch('https://token.jup.ag/all')

  if (!response.ok) {
    throw new Error(`Jupiter token list error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Calculate minimum output with slippage
 */
export function calculateMinOutput(
  outputAmount: bigint,
  slippageBps: number
): bigint {
  return outputAmount - (outputAmount * BigInt(slippageBps)) / 10000n
}

/**
 * Format swap quote for display
 */
export function formatSwapQuote(quote: SwapQuote, inputDecimals: number, outputDecimals: number): string {
  const inputAmount = Number(quote.inputAmount) / Math.pow(10, inputDecimals)
  const outputAmount = Number(quote.outputAmount) / Math.pow(10, outputDecimals)
  const rate = outputAmount / inputAmount

  return [
    `Input: ${inputAmount.toFixed(6)}`,
    `Output: ${outputAmount.toFixed(6)}`,
    `Rate: 1 = ${rate.toFixed(6)}`,
    `Price Impact: ${(quote.priceImpact * 100).toFixed(2)}%`,
    `Route: ${quote.route.map(r => r.protocol).join(' → ')}`,
  ].join('\n')
}
