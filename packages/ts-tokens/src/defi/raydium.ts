/**
 * Raydium Integration
 *
 * AMM and liquidity pool helpers.
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js'
import type { LiquidityPool, CreatePoolOptions, AddLiquidityOptions, RemoveLiquidityOptions } from './types'

// api.raydium.io/v2 was decommissioned; the current API is api-v3.raydium.io.
const RAYDIUM_API = 'https://api-v3.raydium.io'

/**
 * Parse an API amount field into a bigint without lossy float math.
 *
 * Amount fields from pool APIs are usually decimal *strings*; routing them
 * through Number() silently rounds anything above 2^53. Integer strings are
 * parsed directly by BigInt; decimal strings are truncated toward zero via
 * string slicing (fractional base units cannot exist on-chain, and string
 * truncation never rounds the integer part the way Math.floor(Number(x))
 * does above 2^53).
 */
function parseAmountToBigInt(value: unknown): bigint {
  if (value === null || value === undefined || value === '') return 0n
  if (typeof value === 'bigint') return value

  if (typeof value === 'number') {
    // Already a float — convert through its string form so the truncation is
    // decimal-exact for the value as printed (precision above 2^53 was lost
    // at JSON.parse and cannot be recovered).
    return parseAmountToBigInt(String(value))
  }

  const str = String(value).trim()
  // Exponent notation ("1e6") — rare from these APIs; expand via Number and
  // re-parse the printed decimal form.
  if (/e/i.test(str)) {
    return parseAmountToBigInt(String(Number(str)))
  }

  const negative = str.startsWith('-')
  const unsigned = negative ? str.slice(1) : str
  const integerPart = unsigned.split('.')[0]
  if (!/^\d+$/.test(integerPart)) return 0n

  const parsed = BigInt(integerPart)
  return negative ? -parsed : parsed
}

/**
 * Parse a v3 pool object into a LiquidityPool.
 *
 * The v3 shape nests mints/amounts under mintA/mintB and vault/reserve fields;
 * fall back across a few likely keys so we tolerate minor schema drift without
 * silently returning zeros.
 */
function parseV3Pool(poolAddress: PublicKey, pool: any): LiquidityPool {
  return {
    address: poolAddress,
    protocol: 'raydium',
    tokenA: new PublicKey(pool.mintA?.address ?? pool.baseMint ?? pool.mintA),
    tokenB: new PublicKey(pool.mintB?.address ?? pool.quoteMint ?? pool.mintB),
    reserveA: parseAmountToBigInt(pool.mintAmountA ?? pool.baseReserve ?? 0),
    reserveB: parseAmountToBigInt(pool.mintAmountB ?? pool.quoteReserve ?? 0),
    lpMint: new PublicKey(pool.lpMint?.address ?? pool.lpMint ?? PublicKey.default),
    lpSupply: parseAmountToBigInt(pool.lpAmount ?? pool.lpSupply ?? 0),
    fee: pool.feeRate ?? pool.fee ?? 0.0025, // 0.25% default
    apy: pool.day?.apr ?? pool.apy,
  }
}

/**
 * Get pool info
 */
export async function getPoolInfo(
  _connection: Connection,
  poolAddress: PublicKey
): Promise<LiquidityPool | null> {
  let response: Response
  try {
    response = await fetch(`${RAYDIUM_API}/pools/info/ids?ids=${poolAddress.toBase58()}`)
  } catch (error) {
    throw new Error(
      `Failed to reach Raydium API: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // 404 = pool genuinely not found; any other non-ok is a failure to surface.
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Raydium API error: ${response.status} ${response.statusText}`)
  }

  const body = await response.json()
  const pool = Array.isArray(body.data) ? body.data[0] : (body.data ?? body)
  if (!pool) return null

  return parseV3Pool(poolAddress, pool)
}

/**
 * Get all pools for a token
 */
export async function getPoolsForToken(
  tokenMint: PublicKey
): Promise<LiquidityPool[]> {
  const mintAddress = tokenMint.toBase58()
  const url = `${RAYDIUM_API}/pools/info/mint`
    + `?mint1=${mintAddress}&poolType=all&poolSortField=default`
    + `&sortType=desc&pageSize=100&page=1`

  let response: Response
  try {
    response = await fetch(url)
  } catch (error) {
    throw new Error(
      `Failed to reach Raydium API: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // 404 = no pools for this token (genuinely empty); other non-ok is a failure.
  if (response.status === 404) return []
  if (!response.ok) {
    throw new Error(`Raydium API error: ${response.status} ${response.statusText}`)
  }

  const body = await response.json()
  // v3 wraps the page under data.data; tolerate a few shapes.
  const pools: any[] = body.data?.data ?? body.data ?? (Array.isArray(body) ? body : [])

  return pools.map((pool) =>
    parseV3Pool(new PublicKey(pool.id ?? pool.ammId ?? pool.address), pool)
  )
}

/**
 * Calculate pool price
 */
export function calculatePoolPrice(pool: LiquidityPool): number {
  if (pool.reserveA === 0n) return 0
  return Number(pool.reserveB) / Number(pool.reserveA)
}

/**
 * Calculate LP token value
 */
export function calculateLPValue(
  pool: LiquidityPool,
  lpAmount: bigint,
  priceA: number,
  priceB: number
): number {
  if (pool.lpSupply === 0n) return 0

  const shareA = (Number(pool.reserveA) * Number(lpAmount)) / Number(pool.lpSupply)
  const shareB = (Number(pool.reserveB) * Number(lpAmount)) / Number(pool.lpSupply)

  return shareA * priceA + shareB * priceB
}

/**
 * Calculate output amount for swap
 */
export function calculateSwapOutput(
  inputAmount: bigint,
  inputReserve: bigint,
  outputReserve: bigint,
  feeBps: number = 25
): bigint {
  const inputWithFee = inputAmount * BigInt(10000 - feeBps)
  const numerator = inputWithFee * outputReserve
  const denominator = inputReserve * 10000n + inputWithFee

  return numerator / denominator
}

/**
 * Calculate required input for desired output
 */
export function calculateSwapInput(
  outputAmount: bigint,
  inputReserve: bigint,
  outputReserve: bigint,
  feeBps: number = 25
): bigint {
  const numerator = inputReserve * outputAmount * 10000n
  const denominator = (outputReserve - outputAmount) * BigInt(10000 - feeBps)

  return numerator / denominator + 1n
}

/**
 * Calculate price impact
 */
export function calculatePriceImpact(
  inputAmount: bigint,
  outputAmount: bigint,
  inputReserve: bigint,
  outputReserve: bigint
): number {
  const spotPrice = Number(outputReserve) / Number(inputReserve)
  const executionPrice = Number(outputAmount) / Number(inputAmount)

  return Math.abs(1 - executionPrice / spotPrice)
}

/**
 * Calculate optimal LP amounts
 */
export function calculateOptimalLPAmounts(
  pool: LiquidityPool,
  amountA: bigint
): { amountA: bigint; amountB: bigint } {
  if (pool.reserveA === 0n || pool.reserveB === 0n) {
    return { amountA, amountB: amountA }
  }

  const amountB = (amountA * pool.reserveB) / pool.reserveA

  return { amountA, amountB }
}

/**
 * Calculate LP tokens to receive
 */
export function calculateLPTokens(
  pool: LiquidityPool,
  amountA: bigint,
  amountB: bigint
): bigint {
  if (pool.lpSupply === 0n) {
    // Initial liquidity
    const product = amountA * amountB
    // Approximate square root
    let x = product
    let y = (x + 1n) / 2n
    while (y < x) {
      x = y
      y = (x + product / x) / 2n
    }
    return x
  }

  const lpFromA = (amountA * pool.lpSupply) / pool.reserveA
  const lpFromB = (amountB * pool.lpSupply) / pool.reserveB

  return lpFromA < lpFromB ? lpFromA : lpFromB
}

/**
 * Calculate tokens to receive when removing liquidity
 */
export function calculateRemoveLiquidity(
  pool: LiquidityPool,
  lpAmount: bigint
): { amountA: bigint; amountB: bigint } {
  if (pool.lpSupply === 0n) {
    return { amountA: 0n, amountB: 0n }
  }

  const amountA = (lpAmount * pool.reserveA) / pool.lpSupply
  const amountB = (lpAmount * pool.reserveB) / pool.lpSupply

  return { amountA, amountB }
}

/**
 * Format pool info for display
 */
export function formatPoolInfo(pool: LiquidityPool): string {
  const price = calculatePoolPrice(pool)

  return [
    `Pool: ${pool.address.toBase58()}`,
    `Protocol: ${pool.protocol}`,
    `Token A: ${pool.tokenA.toBase58()}`,
    `Token B: ${pool.tokenB.toBase58()}`,
    `Reserve A: ${pool.reserveA}`,
    `Reserve B: ${pool.reserveB}`,
    `Price: ${price.toFixed(6)}`,
    `Fee: ${(pool.fee * 100).toFixed(2)}%`,
    pool.apy ? `APY: ${pool.apy.toFixed(2)}%` : '',
  ].filter(Boolean).join('\n')
}
