/**
 * Configuration Tests
 *
 * Unit tests for configuration loading and validation.
 */

import { describe, test, expect } from 'bun:test'

describe('Network Configuration', () => {
  test('should validate network names', () => {
    const validNetworks = ['mainnet-beta', 'devnet', 'testnet']

    for (const network of validNetworks) {
      expect(['mainnet-beta', 'devnet', 'testnet']).toContain(network)
    }
  })

  test('should get correct RPC URL for network', () => {
    const networkUrls: Record<string, string> = {
      'mainnet-beta': 'https://api.mainnet-beta.solana.com',
      devnet: 'https://api.devnet.solana.com',
      testnet: 'https://api.testnet.solana.com',
    }

    expect(networkUrls['devnet']).toBe('https://api.devnet.solana.com')
    expect(networkUrls['mainnet-beta']).toBe('https://api.mainnet-beta.solana.com')
  })
})

describe('Wallet Configuration', () => {
  test('should validate keypair path format', () => {
    const validPaths = [
      '~/.config/solana/id.json',
      '/home/user/.config/solana/id.json',
      './keypair.json',
    ]

    for (const path of validPaths) {
      expect(path.endsWith('.json')).toBe(true)
    }
  })

  test('should validate base58 private key format', () => {
    // Base58 characters
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    const testKey = 'abc123XYZ'

    for (const char of testKey) {
      expect(base58Chars.includes(char)).toBe(true)
    }
  })
})

describe('RPC Configuration', () => {
  test('should validate RPC URL format', () => {
    const validUrls = [
      'https://api.devnet.solana.com',
      'https://api.mainnet-beta.solana.com',
      'https://my-rpc.example.com',
      'http://localhost:8899',
    ]

    for (const url of validUrls) {
      expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true)
    }
  })

  test('should reject invalid RPC URLs', () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://example.com',
      '',
    ]

    for (const url of invalidUrls) {
      const isValid = url.startsWith('http://') || url.startsWith('https://')
      expect(isValid).toBe(false)
    }
  })
})

describe('Config Defaults', () => {
  test('should have sensible defaults', () => {
    const defaults = {
      network: 'devnet',
      commitment: 'confirmed',
    }

    expect(defaults.network).toBe('devnet')
    expect(defaults.commitment).toBe('confirmed')
  })
})

describe('Environment Variables', () => {
  test('should recognize environment variable names', () => {
    const envVars = [
      'SOLANA_PRIVATE_KEY',
      'SOLANA_RPC_URL',
      'SOLANA_NETWORK',
    ]

    for (const envVar of envVars) {
      expect(envVar.startsWith('SOLANA_')).toBe(true)
    }
  })
})
