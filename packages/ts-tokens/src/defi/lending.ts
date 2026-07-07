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

  let response: Response
  try {
    response = await fetch(url)
  } catch (error) {
    // Network-level failure (DNS, connection reset, etc.) — surface it rather
    // than masking an outage as "no pools".
    throw new Error(
      `Failed to reach ${protocol} lending API: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // 404 means the market genuinely has no pools for this token — a real empty
  // result. Any other non-ok status is a failure that must not be swallowed.
  if (response.status === 404) return []
  if (!response.ok) {
    throw new Error(`${protocol} lending API error: ${response.status} ${response.statusText}`)
  }

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
 * Calculate liquidation price for a borrow position.
 *
 * Returns the collateral price (USD per whole collateral token) at which the
 * position becomes liquidatable. Amounts are base-unit bigints of two
 * potentially different-decimal mints, so both must be normalized to whole
 * tokens before mixing; otherwise the result is off by 10^(borrowDecimals -
 * collateralDecimals).
 *
 * Liquidation triggers when: collateralValue * threshold <= borrowValue
 *   collateralTokens * liqPrice * threshold = borrowTokens * borrowPrice
 *   liqPrice = (borrowTokens * borrowPrice) / (collateralTokens * threshold)
 *
 * The current _collateralPrice is not needed to compute the *liquidation*
 * price (it is the unknown being solved for), but is accepted so callers can
 * pass live market data and derive how far the position is from liquidation.
 */
export function calculateLiquidationPrice(
  collateralAmount: bigint,
  _collateralPrice: number,
  borrowAmount: bigint,
  borrowPrice: number,
  liquidationThreshold: number,
  collateralDecimals: number = 0,
  borrowDecimals: number = 0,
): number {
  const collateralTokens = Number(collateralAmount) / Math.pow(10, collateralDecimals)
  const borrowTokens = Number(borrowAmount) / Math.pow(10, borrowDecimals)

  if (collateralTokens === 0 || liquidationThreshold === 0) return 0

  const borrowValue = borrowTokens * borrowPrice
  return borrowValue / (collateralTokens * liquidationThreshold)
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
