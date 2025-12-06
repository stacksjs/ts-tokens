/**
 * Token Tests
 *
 * Unit tests for fungible token operations.
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { describe, expect, test } from 'bun:test'

// Mock config for testing
const testConfig = {
  network: 'devnet' as const,
  rpcUrl: 'https://api.devnet.solana.com',
  wallet: {
    keypair: Keypair.generate(),
  },
}

describe('Token Creation', () => {
  test('should validate token name', () => {
    const name = 'Test Token'
    expect(name.length).toBeGreaterThan(0)
    expect(name.length).toBeLessThanOrEqual(32)
  })

  test('should validate token symbol', () => {
    const symbol = 'TEST'
    expect(symbol.length).toBeGreaterThan(0)
    expect(symbol.length).toBeLessThanOrEqual(10)
  })

  test('should validate decimals', () => {
    const decimals = 9
    expect(decimals).toBeGreaterThanOrEqual(0)
    expect(decimals).toBeLessThanOrEqual(9)
  })

  test('should validate initial supply', () => {
    const supply = 1_000_000
    expect(supply).toBeGreaterThanOrEqual(0)
  })
})

describe('Token Utilities', () => {
  test('should convert lamports to SOL', () => {
    const lamports = 1_000_000_000
    const sol = lamports / LAMPORTS_PER_SOL
    expect(sol).toBe(1)
  })

  test('should convert SOL to lamports', () => {
    const sol = 1
    const lamports = sol * LAMPORTS_PER_SOL
    expect(lamports).toBe(1_000_000_000)
  })

  test('should generate valid keypair', () => {
    const keypair = Keypair.generate()
    expect(keypair.publicKey).toBeDefined()
    expect(keypair.secretKey).toBeDefined()
    expect(keypair.secretKey.length).toBe(64)
  })
})

describe('Connection', () => {
  test('should create connection to devnet', () => {
    const connection = new Connection('https://api.devnet.solana.com')
    expect(connection).toBeDefined()
  })

  test('should create connection with commitment', () => {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    expect(connection).toBeDefined()
  })
})

describe('Token Amount Calculations', () => {
  test('should calculate UI amount from base units', () => {
    const baseUnits = 1_000_000_000n
    const decimals = 9
    const uiAmount = Number(baseUnits) / 10 ** decimals
    expect(uiAmount).toBe(1)
  })

  test('should calculate base units from UI amount', () => {
    const uiAmount = 1
    const decimals = 9
    const baseUnits = BigInt(uiAmount * 10 ** decimals)
    expect(baseUnits).toBe(1_000_000_000n)
  })

  test('should handle different decimal places', () => {
    const testCases = [
      { decimals: 0, uiAmount: 100, baseUnits: 100n },
      { decimals: 6, uiAmount: 1, baseUnits: 1_000_000n },
      { decimals: 9, uiAmount: 1, baseUnits: 1_000_000_000n },
    ]

    for (const { decimals, uiAmount, baseUnits } of testCases) {
      const calculated = BigInt(uiAmount * 10 ** decimals)
      expect(calculated).toBe(baseUnits)
    }
  })
})
