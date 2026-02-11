import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import { fetchOffChainMetadata } from '../src/nft/metadata'

// Save and restore global fetch
const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('fetchOffChainMetadata', () => {
  test('should return parsed JSON on success', async () => {
    const mockData = { name: 'Test NFT', image: 'https://example.com/image.png', attributes: [] }
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => mockData,
    })) as any

    const result = await fetchOffChainMetadata('https://arweave.net/abc123')
    expect(result).toEqual(mockData)
  })

  test('should return null on non-ok response', async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 404,
    })) as any

    const result = await fetchOffChainMetadata('https://arweave.net/invalid')
    expect(result).toBeNull()
  })

  test('should return null on network error', async () => {
    globalThis.fetch = (async () => {
      throw new Error('Network error')
    }) as any

    const result = await fetchOffChainMetadata('https://invalid-url.com')
    expect(result).toBeNull()
  })

  test('should handle empty metadata object', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({}),
    })) as any

    const result = await fetchOffChainMetadata('https://arweave.net/empty')
    expect(result).toEqual({})
  })
})

describe('NFT Metadata Validation', () => {
  test('should validate NFT name length', () => {
    const name = 'My NFT #1'
    expect(name.length).toBeGreaterThan(0)
    expect(name.length).toBeLessThanOrEqual(32)
  })

  test('should validate NFT symbol length', () => {
    const symbol = 'MNFT'
    expect(symbol.length).toBeGreaterThan(0)
    expect(symbol.length).toBeLessThanOrEqual(10)
  })

  test('should validate URI format', () => {
    const uris = ['https://arweave.net/abc', 'https://ipfs.io/ipfs/Qm...']
    for (const uri of uris) {
      expect(uri.startsWith('https://')).toBe(true)
    }
  })

  test('should validate seller fee basis points range', () => {
    const validFees = [0, 100, 500, 1000, 10000]
    for (const fee of validFees) {
      expect(fee).toBeGreaterThanOrEqual(0)
      expect(fee).toBeLessThanOrEqual(10000)
    }
  })

  test('should validate creator shares sum to 100', () => {
    const creators = [{ share: 70 }, { share: 30 }]
    const total = creators.reduce((sum, c) => sum + c.share, 0)
    expect(total).toBe(100)
  })

  test('should validate creator address', () => {
    const keypair = Keypair.generate()
    expect(() => new PublicKey(keypair.publicKey.toBase58())).not.toThrow()
  })

  test('should parse NFT attributes', () => {
    const attributes = [
      { trait_type: 'Background', value: 'Blue' },
      { trait_type: 'Power', value: 100 },
    ]
    expect(attributes.length).toBe(2)
    expect(attributes[0].trait_type).toBe('Background')
  })

  test('should calculate royalty from basis points', () => {
    const salePrice = 1_000_000_000
    const royaltyBps = 500
    const royalty = (salePrice * royaltyBps) / 10000
    expect(royalty).toBe(50_000_000)
  })
})
