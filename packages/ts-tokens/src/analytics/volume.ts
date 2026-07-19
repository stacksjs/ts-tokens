/**
 * Volume Analytics
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { TradingVolume, WhaleActivity, WhaleWatchConfig } from './types'

/**
 * Get trading volume for a token
 *
 * NOTE: not implemented. Signature counts are available, but computing real
 * volume, unique buyers/sellers, and average trade size requires decoding each
 * transaction's token balance changes, which is not available yet. Returning
 * `trades * 1_000_000` and fixed buyer/seller ratios would be fabricated data.
 */
// eslint-disable-next-line pickier/no-unused-vars
export async function getTradingVolume(
  connection: Connection,
  mint: PublicKey,
  period: '1h' | '24h' | '7d' | '30d' = '24h'
): Promise<TradingVolume> {
  throw new Error(
    'getTradingVolume is not implemented: real volume requires parsing token ' +
    'balance changes per transaction. Signature counts alone cannot produce ' +
    'volume, buyer/seller counts, or average trade size.'
  )
}

/**
 * Get volume breakdown by time intervals
 *
 * NOTE: not implemented. This can only emit zero-filled buckets without real
 * per-transaction volume parsing (see `getTradingVolume`).
 */
// eslint-disable-next-line pickier/no-unused-vars
export async function getVolumeBreakdown(
  connection: Connection,
  mint: PublicKey,
  intervals: number = 24
): Promise<Array<{ timestamp: number; volume: bigint; trades: number }>> {
  throw new Error(
    'getVolumeBreakdown is not implemented: producing per-interval volume ' +
    'requires parsing token balance changes per transaction, which is not ' +
    'available yet.'
  )
}

/**
 * Watch for whale activity
 *
 * NOTE: not implemented. Detecting large transfers requires decoding transfer
 * instructions/balance changes from program logs, which is not available yet,
 * so the alert callback could never fire. Rather than returning a watcher that
 * silently never alerts, construction throws.
 */
// eslint-disable-next-line pickier/no-unused-vars
export function createWhaleWatcher(
  connection: Connection,
  config: WhaleWatchConfig
): { start: () => void; stop: () => void } {
  throw new Error(
    'createWhaleWatcher is not implemented: detecting whale transfers requires ' +
    'decoding transfer amounts from logs, which is not available yet, so the ' +
    'alert callback would never fire.'
  )
}

/**
 * Get recent whale activity
 *
 * NOTE: not implemented. Signatures are available, but the actual transfer
 * addresses, direction, and amounts require decoding each transaction. The
 * previous placeholder reported every signature with `amount: 0n` and the mint
 * as the address, which is fabricated data.
 */
// eslint-disable-next-line pickier/no-unused-vars
export async function getWhaleActivity(
  connection: Connection,
  mint: PublicKey,
  minAmount: bigint,
  limit: number = 20
): Promise<WhaleActivity[]> {
  throw new Error(
    'getWhaleActivity is not implemented: extracting transfer addresses and ' +
    'amounts requires parsing each transaction. Signatures alone cannot ' +
    'identify whale transfers.'
  )
}

/**
 * Calculate volume metrics
 */
export function calculateVolumeMetrics(volumes: TradingVolume[]): {
  totalVolume: bigint
  avgVolume: bigint
  maxVolume: bigint
  minVolume: bigint
  totalTrades: number
} {
  if (volumes.length === 0) {
    return {
      totalVolume: 0n,
      avgVolume: 0n,
      maxVolume: 0n,
      minVolume: 0n,
      totalTrades: 0,
    }
  }

  const totalVolume = volumes.reduce((sum, v) => sum + v.volume, 0n)
  const avgVolume = totalVolume / BigInt(volumes.length)
  const maxVolume = volumes.reduce((max, v) => v.volume > max ? v.volume : max, 0n)
  const minVolume = volumes.reduce((min, v) => v.volume < min ? v.volume : min, volumes[0].volume)
  const totalTrades = volumes.reduce((sum, v) => sum + v.trades, 0)

  return {
    totalVolume,
    avgVolume,
    maxVolume,
    minVolume,
    totalTrades,
  }
}

/**
 * Format volume for display
 */
export function formatVolume(volume: TradingVolume): string {
  return [
    `Token: ${volume.mint.toBase58()}`,
    `Period: ${volume.period}`,
    `Volume: ${volume.volume}`,
    `Volume (USD): $${volume.volumeUsd.toLocaleString()}`,
    `Trades: ${volume.trades}`,
    `Unique Buyers: ${volume.uniqueBuyers}`,
    `Unique Sellers: ${volume.uniqueSellers}`,
    `Avg Trade Size: ${volume.avgTradeSize}`,
  ].join('\n')
}

/**
 * Export volume data to CSV
 */
export function exportVolumeToCSV(
  breakdown: Array<{ timestamp: number; volume: bigint; trades: number }>
): string {
  const headers = 'Timestamp,DateTime,Volume,Trades'
  const rows = breakdown.map(b =>
    `${b.timestamp},${new Date(b.timestamp).toISOString()},${b.volume},${b.trades}`
  )

  return [headers, ...rows].join('\n')
}
