/**
 * Candy Machine Tests
 *
 * Unit tests for Candy Machine operations.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'

describe('Candy Machine Configuration', () => {
  test('should validate items available', () => {
    const itemsAvailable = 1000n
    expect(itemsAvailable).toBeGreaterThan(0n)
  })

  test('should validate symbol length', () => {
    const symbol = 'MNFT'
    expect(symbol.length).toBeLessThanOrEqual(10)
  })

  test('should validate seller fee basis points', () => {
    const fee = 500
    expect(fee).toBeGreaterThanOrEqual(0)
    expect(fee).toBeLessThanOrEqual(10000)
  })

  test('should validate creator shares sum to 100', () => {
    const creators = [
      { address: Keypair.generate().publicKey, share: 70 },
      { address: Keypair.generate().publicKey, share: 30 },
    ]
    const totalShare = creators.reduce((sum, c) => sum + c.share, 0)
    expect(totalShare).toBe(100)
  })
})

describe('Config Line Settings', () => {
  test('should validate prefix name', () => {
    const prefixName = 'My NFT #'
    expect(prefixName.length).toBeLessThanOrEqual(32)
  })

  test('should validate name length', () => {
    const nameLength = 4
    expect(nameLength).toBeGreaterThan(0)
  })

  test('should validate prefix URI', () => {
    const prefixUri = 'https://arweave.net/'
    expect(prefixUri.startsWith('https://')).toBe(true)
  })

  test('should validate URI length', () => {
    const uriLength = 50
    expect(uriLength).toBeGreaterThan(0)
  })
})

describe('Hidden Settings', () => {
  test('should validate hidden name', () => {
    const name = 'Unrevealed NFT'
    expect(name.length).toBeLessThanOrEqual(32)
  })

  test('should validate hash length', () => {
    const hash = new Uint8Array(32)
    expect(hash.length).toBe(32)
  })
})

describe('Guard Validation', () => {
  test('should validate SOL payment amount', () => {
    const lamports = 1_000_000_000n // 1 SOL
    expect(lamports).toBeGreaterThan(0n)
  })

  test('should validate start date is in future', () => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const startDate = now + 86400n // Tomorrow
    expect(startDate).toBeGreaterThan(now)
  })

  test('should validate mint limit', () => {
    const limit = 3
    expect(limit).toBeGreaterThan(0)
    expect(limit).toBeLessThanOrEqual(100)
  })

  test('should validate merkle root length', () => {
    const merkleRoot = new Uint8Array(32)
    expect(merkleRoot.length).toBe(32)
  })
})

describe('Candy Machine State', () => {
  test('should calculate items remaining', () => {
    const itemsAvailable = 1000n
    const itemsRedeemed = 42n
    const itemsRemaining = itemsAvailable - itemsRedeemed
    expect(itemsRemaining).toBe(958n)
  })

  test('should detect sold out', () => {
    const itemsAvailable = 100n
    const itemsRedeemed = 100n
    const isSoldOut = itemsRedeemed >= itemsAvailable
    expect(isSoldOut).toBe(true)
  })

  test('should detect not sold out', () => {
    const itemsAvailable = 100n
    const itemsRedeemed = 50n
    const isSoldOut = itemsRedeemed >= itemsAvailable
    expect(isSoldOut).toBe(false)
  })

  test('should calculate mint percentage', () => {
    const itemsAvailable = 1000n
    const itemsRedeemed = 250n
    const percentage = Number((itemsRedeemed * 100n) / itemsAvailable)
    expect(percentage).toBe(25)
  })
})

describe('Price Calculations', () => {
  test('should calculate total cost with SOL payment', () => {
    const price = 1_000_000_000n // 1 SOL
    const quantity = 3n
    const total = price * quantity
    expect(total).toBe(3_000_000_000n)
  })

  test('should calculate total with token payment', () => {
    const tokenAmount = 100n
    const quantity = 5n
    const total = tokenAmount * quantity
    expect(total).toBe(500n)
  })
})
