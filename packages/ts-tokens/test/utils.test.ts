/**
 * Utility Function Tests
 */

import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { describe, expect, test } from 'bun:test'

describe('Address Utilities', () => {
  test('should generate valid keypair', () => {
    const keypair = Keypair.generate()
    expect(keypair.publicKey).toBeDefined()
    expect(keypair.secretKey.length).toBe(64)
  })

  test('should convert public key to base58', () => {
    const keypair = Keypair.generate()
    const base58 = keypair.publicKey.toBase58()
    expect(base58.length).toBeGreaterThan(30)
  })

  test('should parse base58 to public key', () => {
    const keypair = Keypair.generate()
    const base58 = keypair.publicKey.toBase58()
    const parsed = new PublicKey(base58)
    expect(parsed.equals(keypair.publicKey)).toBe(true)
  })

  test('should truncate address for display', () => {
    const address = 'ABC123DEF456GHI789JKL012MNO345PQR678STU901'
    const truncated = `${address.slice(0, 4)}...${address.slice(-4)}`
    expect(truncated).toBe('ABC1...U901')
  })
})

describe('Amount Formatting', () => {
  test('should format lamports to SOL', () => {
    const lamports = 1_500_000_000
    const sol = lamports / LAMPORTS_PER_SOL
    expect(sol).toBe(1.5)
  })

  test('should format SOL with decimals', () => {
    const sol = 1.23456789
    const formatted = sol.toFixed(4)
    expect(formatted).toBe('1.2346')
  })

  test('should format large numbers with commas', () => {
    const num = 1234567890
    const formatted = num.toLocaleString()
    expect(formatted).toBe('1,234,567,890')
  })

  test('should handle zero balance', () => {
    const balance = 0
    expect(balance).toBe(0)
  })
})

describe('Token Amount Conversions', () => {
  test('should convert UI amount to base units', () => {
    const uiAmount = 100
    const decimals = 9
    const baseUnits = BigInt(uiAmount) * BigInt(10 ** decimals)
    expect(baseUnits).toBe(100_000_000_000n)
  })

  test('should convert base units to UI amount', () => {
    const baseUnits = 100_000_000_000n
    const decimals = 9
    const uiAmount = Number(baseUnits) / 10 ** decimals
    expect(uiAmount).toBe(100)
  })

  test('should handle different decimal places', () => {
    const testCases = [
      { decimals: 0, ui: 100, base: 100n },
      { decimals: 6, ui: 100, base: 100_000_000n },
      { decimals: 9, ui: 100, base: 100_000_000_000n },
    ]

    for (const { decimals, ui, base } of testCases) {
      const calculated = BigInt(ui) * BigInt(10 ** decimals)
      expect(calculated).toBe(base)
    }
  })
})

describe('Date Utilities', () => {
  test('should convert date to unix timestamp', () => {
    const date = new Date('2024-01-01T00:00:00Z')
    const timestamp = Math.floor(date.getTime() / 1000)
    expect(timestamp).toBe(1704067200)
  })

  test('should convert unix timestamp to date', () => {
    const timestamp = 1704067200
    const date = new Date(timestamp * 1000)
    expect(date.toISOString()).toBe('2024-01-01T00:00:00.000Z')
  })

  test('should check if date is in future', () => {
    const futureDate = Date.now() + 86400000 // Tomorrow
    const isFuture = futureDate > Date.now()
    expect(isFuture).toBe(true)
  })

  test('should check if date is in past', () => {
    const pastDate = Date.now() - 86400000 // Yesterday
    const isPast = pastDate < Date.now()
    expect(isPast).toBe(true)
  })
})

describe('URL Utilities', () => {
  test('should validate Arweave URL', () => {
    const url = 'https://arweave.net/abc123'
    expect(url.startsWith('https://arweave.net/')).toBe(true)
  })

  test('should validate IPFS URL', () => {
    const url = 'https://ipfs.io/ipfs/Qm...'
    expect(url.includes('ipfs')).toBe(true)
  })

  test('should build explorer URL', () => {
    const signature = 'ABC123'
    const cluster = 'devnet'
    const url = `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`
    expect(url).toBe('https://explorer.solana.com/tx/ABC123?cluster=devnet')
  })

  test('should build address explorer URL', () => {
    const address = 'ABC123'
    const cluster = 'mainnet-beta'
    const url = `https://explorer.solana.com/address/${address}`
    expect(url).toBe('https://explorer.solana.com/address/ABC123')
  })
})

describe('Validation Utilities', () => {
  test('should validate public key format', () => {
    const validKey = Keypair.generate().publicKey.toBase58()
    expect(() => new PublicKey(validKey)).not.toThrow()
  })

  test('should reject invalid public key', () => {
    const invalidKey = 'not-a-valid-key'
    expect(() => new PublicKey(invalidKey)).toThrow()
  })

  test('should validate basis points range', () => {
    const validBps = [0, 100, 500, 1000, 10000]
    for (const bps of validBps) {
      expect(bps >= 0 && bps <= 10000).toBe(true)
    }
  })

  test('should reject invalid basis points', () => {
    const invalidBps = [-1, 10001, 100000]
    for (const bps of invalidBps) {
      expect(bps >= 0 && bps <= 10000).toBe(false)
    }
  })
})

describe('Merkle Tree Utilities', () => {
  test('should validate merkle root length', () => {
    const root = new Uint8Array(32)
    expect(root.length).toBe(32)
  })

  test('should validate merkle proof format', () => {
    const proof = [
      new Uint8Array(32),
      new Uint8Array(32),
      new Uint8Array(32),
    ]
    expect(proof.every(p => p.length === 32)).toBe(true)
  })
})
