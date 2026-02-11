import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import { calculateMovingAverage, calculateRSI, detectTrend, formatPriceHistory, exportPriceHistoryToCSV, exportData } from '../src/analytics/history'
import { compareSnapshots, identifyWhales, formatHolderDistribution, exportHoldersToCSV } from '../src/analytics/holders'
import { calculateVolumeMetrics, formatVolume, exportVolumeToCSV } from '../src/analytics/volume'
import type { PricePoint, PriceHistory, HolderDistribution, HolderSnapshot, TradingVolume, TokenHolder } from '../src/analytics/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePricePoint(overrides: Partial<PricePoint> = {}): PricePoint {
  return {
    timestamp: Date.now(),
    price: 1.0,
    volume: 1000n,
    high: 1.1,
    low: 0.9,
    open: 0.95,
    close: 1.05,
    ...overrides,
  }
}

function makeHolder(rank: number, percentage: number, balance: bigint): TokenHolder {
  return {
    address: Keypair.generate().publicKey,
    balance,
    percentage,
    rank,
    tokenAccount: Keypair.generate().publicKey,
  }
}

function makeDistribution(holders: TokenHolder[], overrides: Partial<HolderDistribution> = {}): HolderDistribution {
  const totalSupply = holders.reduce((sum, h) => sum + h.balance, 0n)
  return {
    mint: Keypair.generate().publicKey,
    totalSupply,
    circulatingSupply: totalSupply,
    holders,
    totalHolders: holders.length,
    top10Percentage: 80,
    top100Percentage: 95,
    giniCoefficient: 0.75,
    timestamp: Date.now(),
    ...overrides,
  }
}

function makeTradingVolume(overrides: Partial<TradingVolume> = {}): TradingVolume {
  return {
    mint: Keypair.generate().publicKey,
    period: '24h',
    volume: 500_000n,
    volumeUsd: 50000,
    trades: 200,
    uniqueBuyers: 120,
    uniqueSellers: 80,
    avgTradeSize: 2500n,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// calculateMovingAverage
// ---------------------------------------------------------------------------

describe('calculateMovingAverage', () => {
  test('returns zeros for indices before the period is reached', () => {
    const points = [1, 2, 3, 4, 5].map(p => makePricePoint({ price: p }))
    const result = calculateMovingAverage(points, 3)
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(0)
  })

  test('computes correct moving averages after the initial window', () => {
    const points = [10, 20, 30, 40, 50].map(p => makePricePoint({ price: p }))
    const result = calculateMovingAverage(points, 3)
    // index 2: avg(10,20,30) = 20
    expect(result[2]).toBe(20)
    // index 3: avg(20,30,40) = 30
    expect(result[3]).toBe(30)
    // index 4: avg(30,40,50) = 40
    expect(result[4]).toBe(40)
  })

  test('returns array of same length as input', () => {
    const points = Array.from({ length: 20 }, (_, i) => makePricePoint({ price: i + 1 }))
    const result = calculateMovingAverage(points, 5)
    expect(result.length).toBe(20)
  })

  test('period of 1 returns original prices', () => {
    const prices = [5, 10, 15]
    const points = prices.map(p => makePricePoint({ price: p }))
    const result = calculateMovingAverage(points, 1)
    expect(result).toEqual([5, 10, 15])
  })
})

// ---------------------------------------------------------------------------
// calculateRSI
// ---------------------------------------------------------------------------

describe('calculateRSI', () => {
  test('returns neutral (50) values before the period is reached', () => {
    const points = Array.from({ length: 20 }, (_, i) => makePricePoint({ price: 100 + i }))
    const result = calculateRSI(points, 14)
    // First 13 values (indices 0..12) should be 50
    for (let i = 0; i < 13; i++) {
      expect(result[i]).toBe(50)
    }
  })

  test('returns 100 when all price changes are positive (no losses)', () => {
    const points = Array.from({ length: 20 }, (_, i) => makePricePoint({ price: 10 + i * 2 }))
    const result = calculateRSI(points, 14)
    // After the warm-up period, RSI should be 100 because avgLoss = 0
    const lastValue = result[result.length - 1]
    expect(lastValue).toBe(100)
  })

  test('returns values between 0 and 100 for mixed data', () => {
    const prices = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
      45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64]
    const points = prices.map(p => makePricePoint({ price: p }))
    const result = calculateRSI(points, 14)
    for (const val of result) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  test('output length equals dataPoints.length - 1', () => {
    const points = Array.from({ length: 30 }, (_, i) => makePricePoint({ price: 50 + Math.sin(i) * 10 }))
    const result = calculateRSI(points, 14)
    expect(result.length).toBe(points.length - 1)
  })
})

// ---------------------------------------------------------------------------
// detectTrend
// ---------------------------------------------------------------------------

describe('detectTrend', () => {
  test('returns bullish when prices trend strongly upward', () => {
    const points = Array.from({ length: 20 }, (_, i) => makePricePoint({ price: 100 + i * 10 }))
    expect(detectTrend(points)).toBe('bullish')
  })

  test('returns bearish when prices trend strongly downward', () => {
    const points = Array.from({ length: 20 }, (_, i) => makePricePoint({ price: 200 - i * 10 }))
    expect(detectTrend(points)).toBe('bearish')
  })

  test('returns neutral for flat prices', () => {
    const points = Array.from({ length: 20 }, () => makePricePoint({ price: 100 }))
    expect(detectTrend(points)).toBe('neutral')
  })

  test('returns neutral for fewer than 2 data points', () => {
    expect(detectTrend([])).toBe('neutral')
    expect(detectTrend([makePricePoint()])).toBe('neutral')
  })
})

// ---------------------------------------------------------------------------
// formatPriceHistory
// ---------------------------------------------------------------------------

describe('formatPriceHistory', () => {
  test('includes all expected fields in the output', () => {
    const mint = Keypair.generate().publicKey
    const history: PriceHistory = {
      mint,
      period: '7d',
      dataPoints: [makePricePoint({ price: 1 }), makePricePoint({ price: 2 })],
      priceChange: 1.0,
      priceChangePercentage: 100.0,
      high: 2.0,
      low: 1.0,
      avgPrice: 1.5,
    }
    const output = formatPriceHistory(history)
    expect(output).toContain(`Token: ${mint.toBase58()}`)
    expect(output).toContain('Period: 7d')
    expect(output).toContain('+1.0000')
    expect(output).toContain('+100.00%')
    expect(output).toContain('High: 2.0000')
    expect(output).toContain('Low: 1.0000')
    expect(output).toContain('Avg: 1.5000')
    expect(output).toContain('Data Points: 2')
  })

  test('formats negative price change without plus sign', () => {
    const history: PriceHistory = {
      mint: Keypair.generate().publicKey,
      period: '24h',
      dataPoints: [],
      priceChange: -0.5,
      priceChangePercentage: -25.0,
      high: 2.0,
      low: 1.5,
      avgPrice: 1.75,
    }
    const output = formatPriceHistory(history)
    expect(output).toContain('-0.5000')
    expect(output).toContain('-25.00%')
    expect(output).not.toContain('+-')
  })
})

// ---------------------------------------------------------------------------
// exportPriceHistoryToCSV
// ---------------------------------------------------------------------------

describe('exportPriceHistoryToCSV', () => {
  test('produces a valid CSV with headers and one row per data point', () => {
    const ts = 1700000000000
    const history: PriceHistory = {
      mint: Keypair.generate().publicKey,
      period: '24h',
      dataPoints: [
        makePricePoint({ timestamp: ts, open: 1.0, high: 1.5, low: 0.8, close: 1.2, volume: 999n }),
      ],
      priceChange: 0.2,
      priceChangePercentage: 20,
      high: 1.5,
      low: 0.8,
      avgPrice: 1.1,
    }
    const csv = exportPriceHistoryToCSV(history)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Timestamp,DateTime,Open,High,Low,Close,Volume')
    expect(lines.length).toBe(2)
    expect(lines[1]).toContain(String(ts))
    expect(lines[1]).toContain('999')
  })

  test('handles empty data points', () => {
    const history: PriceHistory = {
      mint: Keypair.generate().publicKey,
      period: '1h',
      dataPoints: [],
      priceChange: 0,
      priceChangePercentage: 0,
      high: 0,
      low: 0,
      avgPrice: 0,
    }
    const csv = exportPriceHistoryToCSV(history)
    const lines = csv.split('\n')
    expect(lines.length).toBe(1) // header only
  })
})

// ---------------------------------------------------------------------------
// exportData
// ---------------------------------------------------------------------------

describe('exportData', () => {
  test('exports JSON format with pretty printing', () => {
    const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]
    const result = exportData(data, { format: 'json' })
    const parsed = JSON.parse(result)
    expect(parsed).toEqual(data)
  })

  test('exports CSV format with headers by default', () => {
    const data = [{ x: 1, y: 2 }, { x: 3, y: 4 }]
    const result = exportData(data, { format: 'csv' })
    const lines = result.split('\n')
    expect(lines[0]).toBe('x,y')
    expect(lines[1]).toBe('1,2')
    expect(lines[2]).toBe('3,4')
  })

  test('exports CSV without headers when includeHeaders is false', () => {
    const data = [{ a: 'hello', b: 'world' }]
    const result = exportData(data, { format: 'csv', includeHeaders: false })
    const lines = result.split('\n')
    expect(lines.length).toBe(1)
    expect(lines[0]).toBe('hello,world')
  })

  test('returns empty string for CSV with empty data', () => {
    const result = exportData([], { format: 'csv' })
    expect(result).toBe('')
  })

  test('throws for unsupported format', () => {
    expect(() => exportData([{ a: 1 }], { format: 'xlsx' })).toThrow('Unsupported format: xlsx')
  })
})

// ---------------------------------------------------------------------------
// compareSnapshots
// ---------------------------------------------------------------------------

describe('compareSnapshots', () => {
  test('calculates holder growth correctly', () => {
    const mint = Keypair.generate().publicKey
    const before: HolderSnapshot = {
      mint,
      timestamp: 1000,
      totalHolders: 100,
      top10Holdings: 5000n,
      top100Holdings: 8000n,
      medianHolding: 50n,
    }
    const after: HolderSnapshot = {
      mint,
      timestamp: 2000,
      totalHolders: 150,
      top10Holdings: 6000n,
      top100Holdings: 9000n,
      medianHolding: 45n,
    }
    const result = compareSnapshots(before, after)
    expect(result.holderChange).toBe(50)
    expect(result.holderChangePercentage).toBe(50)
    expect(result.concentrationChange).toBe(1000) // 6000 - 5000
  })

  test('handles zero holders in before snapshot', () => {
    const mint = Keypair.generate().publicKey
    const before: HolderSnapshot = {
      mint, timestamp: 0, totalHolders: 0,
      top10Holdings: 0n, top100Holdings: 0n, medianHolding: 0n,
    }
    const after: HolderSnapshot = {
      mint, timestamp: 1000, totalHolders: 10,
      top10Holdings: 100n, top100Holdings: 200n, medianHolding: 5n,
    }
    const result = compareSnapshots(before, after)
    expect(result.holderChange).toBe(10)
    expect(result.holderChangePercentage).toBe(0) // division by zero guard
  })

  test('reports negative change when holders decrease', () => {
    const mint = Keypair.generate().publicKey
    const before: HolderSnapshot = {
      mint, timestamp: 0, totalHolders: 200,
      top10Holdings: 8000n, top100Holdings: 15000n, medianHolding: 50n,
    }
    const after: HolderSnapshot = {
      mint, timestamp: 1000, totalHolders: 180,
      top10Holdings: 7000n, top100Holdings: 14000n, medianHolding: 45n,
    }
    const result = compareSnapshots(before, after)
    expect(result.holderChange).toBe(-20)
    expect(result.holderChangePercentage).toBe(-10)
    expect(result.concentrationChange).toBe(-1000)
  })
})

// ---------------------------------------------------------------------------
// identifyWhales
// ---------------------------------------------------------------------------

describe('identifyWhales', () => {
  test('returns holders at or above the threshold percentage', () => {
    const holders = [
      makeHolder(1, 15.0, 15000n),
      makeHolder(2, 5.0, 5000n),
      makeHolder(3, 0.5, 500n),
      makeHolder(4, 1.0, 1000n),
    ]
    const dist = makeDistribution(holders)
    const whales = identifyWhales(dist, 5)
    expect(whales.length).toBe(2)
    expect(whales[0].percentage).toBe(15.0)
    expect(whales[1].percentage).toBe(5.0)
  })

  test('uses default threshold of 1% when not specified', () => {
    const holders = [
      makeHolder(1, 2.0, 2000n),
      makeHolder(2, 0.5, 500n),
      makeHolder(3, 1.0, 1000n),
    ]
    const dist = makeDistribution(holders)
    const whales = identifyWhales(dist)
    expect(whales.length).toBe(2) // 2.0% and 1.0%
  })

  test('returns empty array when no holders meet threshold', () => {
    const holders = [
      makeHolder(1, 0.1, 100n),
      makeHolder(2, 0.2, 200n),
    ]
    const dist = makeDistribution(holders)
    const whales = identifyWhales(dist, 1)
    expect(whales.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// formatHolderDistribution
// ---------------------------------------------------------------------------

describe('formatHolderDistribution', () => {
  test('includes key metrics and top holders', () => {
    const holders = [makeHolder(1, 30.0, 30000n), makeHolder(2, 20.0, 20000n)]
    const dist = makeDistribution(holders, {
      totalHolders: 500,
      top10Percentage: 65.5,
      top100Percentage: 90.2,
      giniCoefficient: 0.82,
    })
    const output = formatHolderDistribution(dist)
    expect(output).toContain(`Token: ${dist.mint.toBase58()}`)
    expect(output).toContain('Total Holders: 500')
    expect(output).toContain('Top 10 Hold: 65.50%')
    expect(output).toContain('Top 100 Hold: 90.20%')
    expect(output).toContain('Gini Coefficient: 0.8200')
    expect(output).toContain('Top Holders:')
    expect(output).toContain('30.00%')
  })
})

// ---------------------------------------------------------------------------
// exportHoldersToCSV
// ---------------------------------------------------------------------------

describe('exportHoldersToCSV', () => {
  test('generates CSV with header and holder rows', () => {
    const holders = [makeHolder(1, 50.0, 50000n), makeHolder(2, 30.0, 30000n)]
    const dist = makeDistribution(holders)
    const csv = exportHoldersToCSV(dist)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Rank,Address,Balance,Percentage')
    expect(lines.length).toBe(3) // header + 2 rows
    expect(lines[1]).toContain('1,')
    expect(lines[1]).toContain('50000')
    expect(lines[1]).toContain('50')
  })

  test('produces only header for empty holders', () => {
    const dist = makeDistribution([])
    const csv = exportHoldersToCSV(dist)
    const lines = csv.split('\n')
    expect(lines.length).toBe(1)
    expect(lines[0]).toBe('Rank,Address,Balance,Percentage')
  })
})

// ---------------------------------------------------------------------------
// calculateVolumeMetrics
// ---------------------------------------------------------------------------

describe('calculateVolumeMetrics', () => {
  test('computes correct aggregated metrics', () => {
    const volumes = [
      makeTradingVolume({ volume: 1000n, trades: 10 }),
      makeTradingVolume({ volume: 3000n, trades: 30 }),
      makeTradingVolume({ volume: 2000n, trades: 20 }),
    ]
    const metrics = calculateVolumeMetrics(volumes)
    expect(metrics.totalVolume).toBe(6000n)
    expect(metrics.avgVolume).toBe(2000n)
    expect(metrics.maxVolume).toBe(3000n)
    expect(metrics.minVolume).toBe(1000n)
    expect(metrics.totalTrades).toBe(60)
  })

  test('returns zeros for empty array', () => {
    const metrics = calculateVolumeMetrics([])
    expect(metrics.totalVolume).toBe(0n)
    expect(metrics.avgVolume).toBe(0n)
    expect(metrics.maxVolume).toBe(0n)
    expect(metrics.minVolume).toBe(0n)
    expect(metrics.totalTrades).toBe(0)
  })

  test('handles single volume entry', () => {
    const volumes = [makeTradingVolume({ volume: 4200n, trades: 42 })]
    const metrics = calculateVolumeMetrics(volumes)
    expect(metrics.totalVolume).toBe(4200n)
    expect(metrics.avgVolume).toBe(4200n)
    expect(metrics.maxVolume).toBe(4200n)
    expect(metrics.minVolume).toBe(4200n)
    expect(metrics.totalTrades).toBe(42)
  })
})

// ---------------------------------------------------------------------------
// formatVolume
// ---------------------------------------------------------------------------

describe('formatVolume', () => {
  test('includes all fields in the formatted output', () => {
    const mint = Keypair.generate().publicKey
    const vol: TradingVolume = {
      mint,
      period: '7d',
      volume: 1_000_000n,
      volumeUsd: 250000,
      trades: 500,
      uniqueBuyers: 300,
      uniqueSellers: 200,
      avgTradeSize: 2000n,
    }
    const output = formatVolume(vol)
    expect(output).toContain(`Token: ${mint.toBase58()}`)
    expect(output).toContain('Period: 7d')
    expect(output).toContain('Volume: 1000000')
    expect(output).toContain('Trades: 500')
    expect(output).toContain('Unique Buyers: 300')
    expect(output).toContain('Unique Sellers: 200')
    expect(output).toContain('Avg Trade Size: 2000')
  })
})

// ---------------------------------------------------------------------------
// exportVolumeToCSV
// ---------------------------------------------------------------------------

describe('exportVolumeToCSV', () => {
  test('generates CSV with header and correct row data', () => {
    const ts = 1700000000000
    const breakdown = [
      { timestamp: ts, volume: 100n, trades: 5 },
      { timestamp: ts + 3600000, volume: 200n, trades: 10 },
    ]
    const csv = exportVolumeToCSV(breakdown)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Timestamp,DateTime,Volume,Trades')
    expect(lines.length).toBe(3)
    expect(lines[1]).toContain(String(ts))
    expect(lines[1]).toContain('100')
    expect(lines[1]).toContain('5')
    expect(lines[2]).toContain('200')
    expect(lines[2]).toContain('10')
  })

  test('handles empty breakdown array', () => {
    const csv = exportVolumeToCSV([])
    const lines = csv.split('\n')
    expect(lines.length).toBe(1)
    expect(lines[0]).toBe('Timestamp,DateTime,Volume,Trades')
  })
})
