import { describe, test, expect } from 'bun:test'
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import type { TokenConfig } from '../src/types'

describe('Token Amount Calculations', () => {
  test('should convert lamports to SOL', () => {
    const lamports = 1_000_000_000
    const sol = lamports / LAMPORTS_PER_SOL
    expect(sol).toBe(1)
  })

  test('should convert SOL to lamports', () => {
    const sol = 1.5
    const lamports = sol * LAMPORTS_PER_SOL
    expect(lamports).toBe(1_500_000_000)
  })

  test('should calculate UI amount from base units', () => {
    const baseUnits = 1_000_000_000n
    const decimals = 9
    const uiAmount = Number(baseUnits) / Math.pow(10, decimals)
    expect(uiAmount).toBe(1)
  })

  test('should calculate base units from UI amount', () => {
    const uiAmount = 1
    const decimals = 9
    const baseUnits = BigInt(uiAmount * Math.pow(10, decimals))
    expect(baseUnits).toBe(1_000_000_000n)
  })

  test('should handle different decimal places', () => {
    const cases = [
      { decimals: 0, uiAmount: 100, baseUnits: 100n },
      { decimals: 6, uiAmount: 1, baseUnits: 1_000_000n },
      { decimals: 9, uiAmount: 1, baseUnits: 1_000_000_000n },
    ]
    for (const { decimals, uiAmount, baseUnits } of cases) {
      expect(BigInt(uiAmount * Math.pow(10, decimals))).toBe(baseUnits)
    }
  })
})

describe('Token Types', () => {
  test('should import TokenConfig type', () => {
    const config: Partial<TokenConfig> = {
      chain: 'solana',
      network: 'devnet',
    }
    expect(config.chain).toBe('solana')
  })
})

describe('Solana Primitives', () => {
  test('should generate valid keypair', () => {
    const keypair = Keypair.generate()
    expect(keypair.publicKey).toBeDefined()
    expect(keypair.secretKey.length).toBe(64)
  })

  test('should create connection', () => {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    expect(connection).toBeDefined()
  })
})
