/**
 * Token Lending Protocol Helpers
 *
 * Unified interface for interacting with Solana lending protocols.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { LendingMarket, BorrowOptions } from './types'

export type LendingProtocol = 'solend' | 'kamino' | 'marginfi'

export interface LendingPoolInfo {
  protocol: LendingProtocol
  market: PublicKey
  mint: PublicKey
  symbol: string
  supplyApy: number
  borrowApy: number
  totalSupply: bigint
  totalBorrow: bigint
  utilizationRate: number
  collateralFactor: number
  liquidationThreshold: number
  reserveAvailable: bigint
}

export interface LendingPosition {
  protocol: LendingProtocol
  market: PublicKey
  supplied: Array<{ mint: PublicKey; amount: bigint; value: number }>
  borrowed: Array<{ mint: PublicKey; amount: bigint; value: number }>
  healthFactor: number
  netApy: number
}

const LENDING_APIS: Record<LendingProtocol, string> = {
  solend: 'https://api.solend.fi/v1',
  kamino: 'https://api.kamino.finance/v1',
  marginfi: 'https://api.marginfi.com/v1',
}

/**
 * Get lending pools across protocols
 */
export async function getLendingPools(
  protocol: LendingProtocol,
  mint?: PublicKey,
): Promise<LendingPoolInfo[]> {
  const baseUrl = LENDING_APIS[protocol]
  const url = mint
    ? `${baseUrl}/markets?token=${mint.toBase58()}`
    : `${baseUrl}/markets`

  try {
    const response = await fetch(url)
    if (!response.ok) return []
    const data = await response.json()

    return (data.markets ?? data.pools ?? data ?? []).map((pool: any) => ({
      protocol,
      market: new PublicKey(pool.address ?? pool.market ?? PublicKey.default),
      mint: new PublicKey(pool.mint ?? pool.tokenMint ?? PublicKey.default),
      symbol: pool.symbol ?? '',
      supplyApy: pool.supplyApy ?? pool.supply_apy ?? 0,
      borrowApy: pool.borrowApy ?? pool.borrow_apy ?? 0,
      totalSupply: BigInt(pool.totalSupply ?? pool.total_supply ?? 0),
      totalBorrow: BigInt(pool.totalBorrow ?? pool.total_borrow ?? 0),
      utilizationRate: pool.utilizationRate ?? pool.utilization ?? 0,
      collateralFactor: pool.collateralFactor ?? pool.ltv ?? 0,
      liquidationThreshold: pool.liquidationThreshold ?? pool.liq_threshold ?? 0,
      reserveAvailable: BigInt(pool.availableLiquidity ?? pool.available ?? 0),
    }))
  } catch {
    return []
  }
}

/**
 * Get best lending rates across protocols for a given token
 */
export async function getBestLendingRates(
  mint: PublicKey,
): Promise<Array<{ protocol: LendingProtocol; supplyApy: number; borrowApy: number }>> {
  const protocols: LendingProtocol[] = ['solend', 'kamino', 'marginfi']

  const results = await Promise.allSettled(
    protocols.map(async (protocol) => {
      const pools = await getLendingPools(protocol, mint)
      if (pools.length === 0) return null
      const best = pools.reduce((a, b) => a.supplyApy > b.supplyApy ? a : b)
      return { protocol, supplyApy: best.supplyApy, borrowApy: best.borrowApy }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
    .sort((a, b) => b.supplyApy - a.supplyApy)
}

/**
 * Calculate liquidation price for a borrow position
 */
export function calculateLiquidationPrice(
  collateralAmount: bigint,
  collateralPrice: number,
  borrowAmount: bigint,
  borrowPrice: number,
  liquidationThreshold: number,
): number {
  // liquidation when: collateral_value * threshold <= borrow_value
  // collateral_amount * liq_price * threshold = borrow_amount * borrow_price
  // liq_price = (borrow_amount * borrow_price) / (collateral_amount * threshold)
  const borrowValue = Number(borrowAmount) * borrowPrice
  const collateralUnits = Number(collateralAmount)

  if (collateralUnits === 0 || liquidationThreshold === 0) return 0

  return borrowValue / (collateralUnits * liquidationThreshold)
}

/**
 * Calculate health factor for a position
 */
export function calculateHealthFactor(
  collateralValue: number,
  borrowValue: number,
  liquidationThreshold: number,
): number {
  if (borrowValue === 0) return Infinity
  return (collateralValue * liquidationThreshold) / borrowValue
}
