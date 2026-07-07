/**
 * Jupiter Integration
 *
 * Swap aggregator integration for token swaps.
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey, VersionedTransaction } from '@solana/web3.js'
import type { SwapQuote, SwapOptions, TokenPrice } from './types'

// Current Jupiter endpoints. The v6 quote-api, price.jup.ag/v4 and
// token.jup.ag hosts were decommissioned; quote + swap now live under
// api.jup.ag/swap/v1 and price/token data under api.jup.ag.
const JUPITER_SWAP_API = 'https://api.jup.ag/swap/v1'
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2'
const JUPITER_TOKENS_API = 'https://api.jup.ag/tokens/v1'

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

  const response = await fetch(`${JUPITER_SWAP_API}/quote?${params}`)

  if (!response.ok) {
    throw new Error(`Jupiter API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    inputMint,
    outputMint,
    inputAmount: BigInt(data.inAmount),
    outputAmount: BigInt(data.outAmount),
    priceImpact: Number(data.priceImpactPct),
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
    // Keep the full quote so /swap receives it unmodified.
    rawQuote: data,
  }
}

/**
 * Build swap transaction from quote
 */
export async function buildSwapTransaction(
  quote: SwapQuote,
  userPublicKey: PublicKey
): Promise<VersionedTransaction> {
  // /swap requires the full, unmodified quoteResponse (routePlan,
  // otherAmountThreshold, swapMode, slippageBps, ...). Forward the raw quote as
  // returned by /quote; a hand-rebuilt partial object is rejected.
  if (!quote.rawQuote) {
    throw new Error(
      'SwapQuote is missing rawQuote; build it via getSwapQuote so the full ' +
      'Jupiter quote can be forwarded to /swap'
    )
  }

  const response = await fetch(`${JUPITER_SWAP_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote.rawQuote,
      userPublicKey: userPublicKey.toBase58(),
      wrapAndUnwrapSol: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Jupiter swap API error: ${response.statusText}`)
  }

  const data = await response.json()

  // Jupiter returns a base64 VersionedTransaction; legacy Transaction.from()
  // throws on the versioned message prefix.
  return VersionedTransaction.deserialize(Buffer.from(data.swapTransaction, 'base64'))
}

/**
 * Execute a swap
 */
export async function executeSwap(
  _connection: Connection,
  options: SwapOptions,
  userPublicKey: PublicKey
): Promise<{ quote: SwapQuote; transaction: VersionedTransaction }> {
  const quote = await getSwapQuote(options)
  const transaction = await buildSwapTransaction(quote, userPublicKey)

  return { quote, transaction }
}

/**
 * Get token price from Jupiter
 */
export async function getTokenPrice(mint: PublicKey): Promise<TokenPrice> {
  const response = await fetch(
    `${JUPITER_PRICE_API}?ids=${mint.toBase58()}`
  )

  if (!response.ok) {
    throw new Error(`Jupiter price API error: ${response.statusText}`)
  }

  const data = await response.json()
  const priceData = data.data?.[mint.toBase58()]

  if (!priceData) {
    throw new Error(`Price not found for ${mint.toBase58()}`)
  }

  return {
    mint,
    // price v2 returns price as a numeric string.
    priceUsd: Number(priceData.price),
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
  const response = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`)

  if (!response.ok) {
    throw new Error(`Jupiter price API error: ${response.statusText}`)
  }

  const data = await response.json()
  const prices = new Map<string, TokenPrice>()

  for (const mint of mints) {
    const address = mint.toBase58()
    const priceData = data.data?.[address]

    if (priceData) {
      prices.set(address, {
        mint,
        priceUsd: Number(priceData.price),
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
  // token.jup.ag/all was decommissioned. The tokens v1 API exposes token
  // metadata by tag; 'verified' is the closest analogue to the old curated
  // list and returns full { address, symbol, name, decimals, logoURI } objects.
  const response = await fetch(`${JUPITER_TOKENS_API}/tagged/verified`)

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
