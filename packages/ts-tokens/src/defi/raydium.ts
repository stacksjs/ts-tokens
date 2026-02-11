/**
 * Raydium Integration
 *
 * AMM and liquidity pool helpers.
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js'
import type { LiquidityPool, CreatePoolOptions, AddLiquidityOptions, RemoveLiquidityOptions } from './types'

const RAYDIUM_API = 'https://api.raydium.io/v2'

/**
 * Get pool info
 */
export async function getPoolInfo(
  connection: Connection,
  poolAddress: PublicKey
): Promise<LiquidityPool | null> {
  try {
    const response = await fetch(`${RAYDIUM_API}/main/pool/${poolAddress.toBase58()}`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    return {
      address: poolAddress,
      protocol: 'raydium',
      tokenA: new PublicKey(data.baseMint),
      tokenB: new PublicKey(data.quoteMint),
      reserveA: BigInt(data.baseReserve),
      reserveB: BigInt(data.quoteReserve),
      lpMint: new PublicKey(data.lpMint),
      lpSupply: BigInt(data.lpSupply),
      fee: data.fee ?? 0.0025, // 0.25% default
      apy: data.apy,
    }
  } catch {
    return null
  }
}

/**
 * Get all pools for a token
 */
export async function getPoolsForToken(
  tokenMint: PublicKey
): Promise<LiquidityPool[]> {
  try {
    const response = await fetch(`${RAYDIUM_API}/main/pairs`)

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const mintAddress = tokenMint.toBase58()

    return data
      .filter((pool: { baseMint: string; quoteMint: string }) =>
        pool.baseMint === mintAddress || pool.quoteMint === mintAddress
      )
      .map((pool: {
        ammId: string
        baseMint: string
        quoteMint: string
        baseReserve: string
        quoteReserve: string
        lpMint: string
        lpSupply: string
        fee: number
        apy: number
      }) => ({
        address: new PublicKey(pool.ammId),
        protocol: 'raydium',
        tokenA: new PublicKey(pool.baseMint),
        tokenB: new PublicKey(pool.quoteMint),
        reserveA: BigInt(pool.baseReserve),
        reserveB: BigInt(pool.quoteReserve),
        lpMint: new PublicKey(pool.lpMint),
        lpSupply: BigInt(pool.lpSupply),
        fee: pool.fee ?? 0.0025,
        apy: pool.apy,
      }))
  } catch {
    return []
  }
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
