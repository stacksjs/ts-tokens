/**
 * Analytics Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Token holder info
 */
export interface TokenHolder {
  address: PublicKey
  balance: bigint
  percentage: number
  rank: number
  tokenAccount: PublicKey
}

/**
 * Holder distribution
 */
export interface HolderDistribution {
  mint: PublicKey
  totalSupply: bigint
  circulatingSupply: bigint
  holders: TokenHolder[]
  totalHolders: number
  top10Percentage: number
  top100Percentage: number
  giniCoefficient: number
  timestamp: number
}

/**
 * Holder snapshot
 */
export interface HolderSnapshot {
  mint: PublicKey
  timestamp: number
  totalHolders: number
  top10Holdings: bigint
  top100Holdings: bigint
  medianHolding: bigint
}

/**
 * Trading volume
 */
export interface TradingVolume {
  mint: PublicKey
  period: '1h' | '24h' | '7d' | '30d'
  volume: bigint
  volumeUsd: number
  trades: number
  uniqueBuyers: number
  uniqueSellers: number
  avgTradeSize: bigint
}

/**
 * Price point
 */
export interface PricePoint {
  timestamp: number
  price: number
  volume: bigint
  high: number
  low: number
  open: number
  close: number
}

/**
 * Price history
 */
export interface PriceHistory {
  mint: PublicKey
  period: '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'all'
  dataPoints: PricePoint[]
  priceChange: number
  priceChangePercentage: number
  high: number
  low: number
  avgPrice: number
}

/**
 * Whale activity
 */
export interface WhaleActivity {
  address: PublicKey
  type: 'buy' | 'sell' | 'transfer_in' | 'transfer_out'
  amount: bigint
  timestamp: number
  signature: string
  priceAtTime?: number
  valueUsd?: number
}

/**
 * Whale watch config
 */
export interface WhaleWatchConfig {
  mint: PublicKey
  minAmount: bigint
  alertCallback?: (activity: WhaleActivity) => void
}

/**
 * Token metrics
 */
export interface TokenMetrics {
  mint: PublicKey
  price: number
  priceChange24h: number
  marketCap: number
  fullyDilutedValuation: number
  volume24h: number
  holders: number
  transactions24h: number
  liquidity: number
  timestamp: number
}

/**
 * NFT collection metrics
 */
export interface CollectionMetrics {
  collection: PublicKey
  floorPrice: bigint
  floorPriceChange24h: number
  volume24h: bigint
  volume7d: bigint
  volumeAll: bigint
  sales24h: number
  listed: number
  totalSupply: number
  owners: number
  uniqueOwnersPercentage: number
  avgPrice24h: bigint
  timestamp: number
}

/**
 * Analytics export format
 */
export type ExportFormat = 'json' | 'csv' | 'xlsx'

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeHeaders?: boolean
}
