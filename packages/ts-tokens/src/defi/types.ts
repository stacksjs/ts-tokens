/**
 * DeFi Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Swap quote
 */
export interface SwapQuote {
  inputMint: PublicKey
  outputMint: PublicKey
  inputAmount: bigint
  outputAmount: bigint
  priceImpact: number
  fee: bigint
  route: SwapRoute[]
  expiresAt: number
}

/**
 * Swap route leg
 */
export interface SwapRoute {
  protocol: string
  inputMint: PublicKey
  outputMint: PublicKey
  inputAmount: bigint
  outputAmount: bigint
  poolAddress: PublicKey
}

/**
 * Swap options
 */
export interface SwapOptions {
  inputMint: PublicKey
  outputMint: PublicKey
  amount: bigint
  slippageBps?: number
  onlyDirectRoutes?: boolean
  maxAccounts?: number
}

/**
 * Liquidity pool info
 */
export interface LiquidityPool {
  address: PublicKey
  protocol: string
  tokenA: PublicKey
  tokenB: PublicKey
  reserveA: bigint
  reserveB: bigint
  lpMint: PublicKey
  lpSupply: bigint
  fee: number
  apy?: number
}

/**
 * Add liquidity options
 */
export interface AddLiquidityOptions {
  pool: PublicKey
  amountA: bigint
  amountB: bigint
  slippageBps?: number
}

/**
 * Remove liquidity options
 */
export interface RemoveLiquidityOptions {
  pool: PublicKey
  lpAmount: bigint
  slippageBps?: number
}

/**
 * Pool creation options
 */
export interface CreatePoolOptions {
  tokenA: PublicKey
  tokenB: PublicKey
  initialAmountA: bigint
  initialAmountB: bigint
  fee?: number
}

/**
 * Token price
 */
export interface TokenPrice {
  mint: PublicKey
  priceUsd: number
  priceChange24h: number
  volume24h: number
  marketCap?: number
  source: string
  timestamp: number
}

/**
 * Staking pool (DeFi)
 */
export interface DeFiStakingPool {
  address: PublicKey
  protocol: string
  stakeMint: PublicKey
  rewardMint: PublicKey
  apy: number
  tvl: bigint
  minStake?: bigint
  lockPeriod?: bigint
}

/**
 * Lending market
 */
export interface LendingMarket {
  address: PublicKey
  protocol: string
  mint: PublicKey
  supplyApy: number
  borrowApy: number
  totalSupply: bigint
  totalBorrow: bigint
  utilizationRate: number
  collateralFactor: number
}

/**
 * Borrow options
 */
export interface BorrowOptions {
  market: PublicKey
  amount: bigint
  collateralMint: PublicKey
  collateralAmount: bigint
}

/**
 * Supported DeFi protocols
 */
export type DeFiProtocol
  = | 'jupiter'
    | 'raydium'
    | 'orca'
    | 'marinade'
    | 'solend'
    | 'mango'
    | 'drift'
    | 'kamino'
