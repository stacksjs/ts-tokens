/**
 * Analytics Tests
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'

describe('Holder Distribution', () => {
  test('should calculate percentage correctly', () => {
    const balance = 1000n
    const totalSupply = 10000n
    const percentage = Number((balance * 10000n) / totalSupply) / 100

    expect(percentage).toBe(10)
  })

  test('should calculate top 10 holdings', () => {
    const holders = [
      { balance: 1000n },
      { balance: 900n },
      { balance: 800n },
      { balance: 700n },
      { balance: 600n },
      { balance: 500n },
      { balance: 400n },
      { balance: 300n },
      { balance: 200n },
      { balance: 100n },
    ]

    const top10 = holders.slice(0, 10).reduce((sum, h) => sum + h.balance, 0n)
    expect(top10).toBe(5500n)
  })

  test('should calculate Gini coefficient', () => {
    // Perfect equality
    const equal = [100, 100, 100, 100]
    const n = equal.length
    const sum = equal.reduce((a, b) => a + b, 0)

    let numerator = 0
    const sorted = [...equal].sort((a, b) => a - b)
    for (let i = 0; i < n; i++) {
      numerator += (2 * (i + 1) - n - 1) * sorted[i]
    }
    const gini = numerator / (n * sum)

    expect(gini).toBe(0) // Perfect equality
  })
})

describe('Volume Analytics', () => {
  test('should calculate average trade size', () => {
    const volume = 10000n
    const trades = 100

    const avgSize = volume / BigInt(trades)
    expect(avgSize).toBe(100n)
  })

  test('should calculate volume metrics', () => {
    const volumes = [
      { volume: 1000n, trades: 10 },
      { volume: 2000n, trades: 20 },
      { volume: 3000n, trades: 30 },
    ]

    const totalVolume = volumes.reduce((sum, v) => sum + v.volume, 0n)
    const totalTrades = volumes.reduce((sum, v) => sum + v.trades, 0)

    expect(totalVolume).toBe(6000n)
    expect(totalTrades).toBe(60)
  })
})

describe('Price History', () => {
  test('should calculate price change', () => {
    const firstPrice = 100
    const lastPrice = 120

    const change = lastPrice - firstPrice
    const changePercentage = (change / firstPrice) * 100

    expect(change).toBe(20)
    expect(changePercentage).toBe(20)
  })

  test('should calculate moving average', () => {
    const prices = [10, 20, 30, 40, 50]
    const period = 3

    const ma: number[] = []
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        ma.push(0)
        continue
      }
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      ma.push(sum / period)
    }

    expect(ma[2]).toBe(20) // (10+20+30)/3
    expect(ma[3]).toBe(30) // (20+30+40)/3
    expect(ma[4]).toBe(40) // (30+40+50)/3
  })

  test('should detect trend', () => {
    const bullish = [10, 15, 20, 25, 30]
    const bearish = [30, 25, 20, 15, 10]
    const neutral = [20, 21, 19, 20, 21]

    const detectTrend = (prices: number[]): string => {
      const firstHalf = prices.slice(0, Math.floor(prices.length / 2))
      const secondHalf = prices.slice(Math.floor(prices.length / 2))
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      const change = (secondAvg - firstAvg) / firstAvg

      if (change > 0.05) return 'bullish'
      if (change < -0.05) return 'bearish'
      return 'neutral'
    }

    expect(detectTrend(bullish)).toBe('bullish')
    expect(detectTrend(bearish)).toBe('bearish')
    expect(detectTrend(neutral)).toBe('neutral')
  })
})

describe('Export Formats', () => {
  test('should export to CSV', () => {
    const data = [
      { rank: 1, address: 'ABC', balance: 1000 },
      { rank: 2, address: 'DEF', balance: 500 },
    ]

    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(d => Object.values(d).join(','))
    const csv = [headers, ...rows].join('\n')

    expect(csv).toContain('rank,address,balance')
    expect(csv).toContain('1,ABC,1000')
  })

  test('should export to JSON', () => {
    const data = [{ rank: 1, balance: 1000 }]
    const json = JSON.stringify(data, null, 2)

    expect(json).toContain('"rank": 1')
    expect(json).toContain('"balance": 1000')
  })
})

describe('Whale Detection', () => {
  test('should identify whales by percentage', () => {
    const holders = [
      { address: 'A', percentage: 15 },
      { address: 'B', percentage: 5 },
      { address: 'C', percentage: 0.5 },
    ]

    const threshold = 1
    const whales = holders.filter(h => h.percentage >= threshold)

    expect(whales.length).toBe(2)
    expect(whales[0].address).toBe('A')
  })

  test('should track whale activity', () => {
    const activities = [
      { type: 'buy', amount: 10000n },
      { type: 'sell', amount: 5000n },
      { type: 'buy', amount: 8000n },
    ]

    const netFlow = activities.reduce((sum, a) => {
      return a.type === 'buy' ? sum + a.amount : sum - a.amount
    }, 0n)

    expect(netFlow).toBe(13000n) // Net buying
  })
})
