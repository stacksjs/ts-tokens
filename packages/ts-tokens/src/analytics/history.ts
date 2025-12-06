/**
 * Price History Analytics
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { CollectionMetrics, ExportOptions, PriceHistory, PricePoint, TokenMetrics } from './types'

/**
 * Get price history for a token
 */
export async function getPriceHistory(
  mint: PublicKey,
  period: '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'all' = '7d',
): Promise<PriceHistory> {
  // In production, would fetch from price API (Jupiter, Birdeye, etc.)
  // This is a placeholder showing the structure

  const dataPoints: PricePoint[] = []
  const now = Date.now()

  const periodMs: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
    'all': 3 * 365 * 24 * 60 * 60 * 1000,
  }

  const intervals: Record<string, number> = {
    '1h': 12, // 5 min intervals
    '24h': 24, // 1 hour intervals
    '7d': 168, // 1 hour intervals
    '30d': 30, // 1 day intervals
    '90d': 90, // 1 day intervals
    '1y': 365, // 1 day intervals
    'all': 365, // 1 day intervals
  }

  const numPoints = intervals[period]
  const intervalMs = periodMs[period] / numPoints

  // Generate placeholder data
  for (let i = 0; i < numPoints; i++) {
    const timestamp = now - (numPoints - i) * intervalMs
    dataPoints.push({
      timestamp,
      price: 0,
      volume: 0n,
      high: 0,
      low: 0,
      open: 0,
      close: 0,
    })
  }

  // Calculate metrics
  const prices = dataPoints.map(p => p.price).filter(p => p > 0)
  const high = prices.length > 0 ? Math.max(...prices) : 0
  const low = prices.length > 0 ? Math.min(...prices) : 0
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

  const firstPrice = dataPoints[0]?.price ?? 0
  const lastPrice = dataPoints[dataPoints.length - 1]?.price ?? 0
  const priceChange = lastPrice - firstPrice
  const priceChangePercentage = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0

  return {
    mint,
    period,
    dataPoints,
    priceChange,
    priceChangePercentage,
    high,
    low,
    avgPrice,
  }
}

/**
 * Get token metrics
 */
export async function getTokenMetrics(
  connection: Connection,
  mint: PublicKey,
): Promise<TokenMetrics> {
  // Get supply info
  const supplyInfo = await connection.getTokenSupply(mint)
  const supply = BigInt(supplyInfo.value.amount)

  // In production, would fetch price from API
  const price = 0
  const marketCap = Number(supply) * price

  return {
    mint,
    price,
    priceChange24h: 0,
    marketCap,
    fullyDilutedValuation: marketCap,
    volume24h: 0,
    holders: 0, // Would need to count
    transactions24h: 0,
    liquidity: 0,
    timestamp: Date.now(),
  }
}

/**
 * Get NFT collection metrics
 */
export async function getCollectionMetrics(
  collection: PublicKey,
): Promise<CollectionMetrics> {
  // In production, would fetch from marketplace APIs
  return {
    collection,
    floorPrice: 0n,
    floorPriceChange24h: 0,
    volume24h: 0n,
    volume7d: 0n,
    volumeAll: 0n,
    sales24h: 0,
    listed: 0,
    totalSupply: 0,
    owners: 0,
    uniqueOwnersPercentage: 0,
    avgPrice24h: 0n,
    timestamp: Date.now(),
  }
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(
  dataPoints: PricePoint[],
  period: number,
): number[] {
  const result: number[] = []

  for (let i = 0; i < dataPoints.length; i++) {
    if (i < period - 1) {
      result.push(0)
      continue
    }

    const sum = dataPoints
      .slice(i - period + 1, i + 1)
      .reduce((acc, p) => acc + p.price, 0)

    result.push(sum / period)
  }

  return result
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(dataPoints: PricePoint[], period: number = 14): number[] {
  const result: number[] = []
  const gains: number[] = []
  const losses: number[] = []

  for (let i = 1; i < dataPoints.length; i++) {
    const change = dataPoints[i].price - dataPoints[i - 1].price
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(50) // Neutral
      continue
    }

    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period

    if (avgLoss === 0) {
      result.push(100)
    }
    else {
      const rs = avgGain / avgLoss
      result.push(100 - 100 / (1 + rs))
    }
  }

  return result
}

/**
 * Detect price trends
 */
export function detectTrend(
  dataPoints: PricePoint[],
): 'bullish' | 'bearish' | 'neutral' {
  if (dataPoints.length < 2)
    return 'neutral'

  const prices = dataPoints.map(p => p.price)
  const firstHalf = prices.slice(0, Math.floor(prices.length / 2))
  const secondHalf = prices.slice(Math.floor(prices.length / 2))

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  const change = (secondAvg - firstAvg) / firstAvg

  if (change > 0.05)
    return 'bullish'
  if (change < -0.05)
    return 'bearish'
  return 'neutral'
}

/**
 * Format price history for display
 */
export function formatPriceHistory(history: PriceHistory): string {
  return [
    `Token: ${history.mint.toBase58()}`,
    `Period: ${history.period}`,
    `Price Change: ${history.priceChange >= 0 ? '+' : ''}${history.priceChange.toFixed(4)}`,
    `Change %: ${history.priceChangePercentage >= 0 ? '+' : ''}${history.priceChangePercentage.toFixed(2)}%`,
    `High: ${history.high.toFixed(4)}`,
    `Low: ${history.low.toFixed(4)}`,
    `Avg: ${history.avgPrice.toFixed(4)}`,
    `Data Points: ${history.dataPoints.length}`,
  ].join('\n')
}

/**
 * Export price history to CSV
 */
export function exportPriceHistoryToCSV(history: PriceHistory): string {
  const headers = 'Timestamp,DateTime,Open,High,Low,Close,Volume'
  const rows = history.dataPoints.map(p =>
    `${p.timestamp},${new Date(p.timestamp).toISOString()},${p.open},${p.high},${p.low},${p.close},${p.volume}`,
  )

  return [headers, ...rows].join('\n')
}

/**
 * Export data to specified format
 */
export function exportData<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions,
): string {
  if (options.format === 'json') {
    return JSON.stringify(data, null, 2)
  }

  if (options.format === 'csv') {
    if (data.length === 0)
      return ''

    const headers = Object.keys(data[0])
    const rows = data.map(row =>
      headers.map(h => String(row[h] ?? '')).join(','),
    )

    if (options.includeHeaders !== false) {
      return [headers.join(','), ...rows].join('\n')
    }

    return rows.join('\n')
  }

  throw new Error(`Unsupported format: ${options.format}`)
}
