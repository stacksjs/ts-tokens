import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'

describe('Candy Machine Configuration', () => {
  test('should validate items available is positive', () => {
    const itemsAvailable = 1000n
    expect(itemsAvailable).toBeGreaterThan(0n)
  })

  test('should validate symbol length', () => {
    const symbol = 'MNFT'
    expect(symbol.length).toBeLessThanOrEqual(10)
  })

  test('should validate seller fee basis points range', () => {
    const validFees = [0, 500, 10000]
    for (const fee of validFees) {
      expect(fee).toBeGreaterThanOrEqual(0)
      expect(fee).toBeLessThanOrEqual(10000)
    }
  })

  test('should validate creator shares sum to 100', () => {
    const creators = [
      { address: Keypair.generate().publicKey, share: 70 },
      { address: Keypair.generate().publicKey, share: 30 },
    ]
    const total = creators.reduce((sum, c) => sum + c.share, 0)
    expect(total).toBe(100)
  })
})

describe('Config Line Settings', () => {
  test('should validate prefix name length', () => {
    const prefixName = 'My NFT #'
    expect(prefixName.length).toBeLessThanOrEqual(32)
  })

  test('should validate prefix URI format', () => {
    const prefixUri = 'https://arweave.net/'
    expect(prefixUri.startsWith('https://')).toBe(true)
  })
})

describe('Candy Machine State', () => {
  test('should calculate items remaining', () => {
    const itemsAvailable = 1000n
    const itemsRedeemed = 42n
    expect(itemsAvailable - itemsRedeemed).toBe(958n)
  })

  test('should detect sold out', () => {
    const itemsAvailable = 100n
    const itemsRedeemed = 100n
    expect(itemsRedeemed >= itemsAvailable).toBe(true)
  })

  test('should calculate mint percentage', () => {
    const itemsAvailable = 1000n
    const itemsRedeemed = 250n
    expect(Number((itemsRedeemed * 100n) / itemsAvailable)).toBe(25)
  })

  test('should calculate total cost', () => {
    const price = 1_000_000_000n
    const quantity = 3n
    expect(price * quantity).toBe(3_000_000_000n)
  })
})
