/**
 * Marketplace Integration Tests
 *
 * Tests for pure utility functions exported by the Magic Eden and Tensor
 * marketplace modules: getListingUrl, getCollectionUrl, and formatPrice.
 */

import { describe, test, expect, afterEach } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import * as magiceden from '../src/marketplace/magiceden'
import * as tensor from '../src/marketplace/tensor'

// ---------------------------------------------------------------------------
// Fetch mocking (REST/GraphQL error handling tests)
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch

function mockFetchOnce(handler: (url: string, init?: RequestInit) => Promise<Response>): void {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    return handler(typeof url === 'string' ? url : url.toString(), init)
  }) as typeof fetch
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

// ---------------------------------------------------------------------------
// Magic Eden
// ---------------------------------------------------------------------------

describe('magiceden.getListingUrl', () => {
  test('should return a URL containing magiceden.io and the mint address', () => {
    const mint = Keypair.generate().publicKey
    const url = magiceden.getListingUrl(mint)

    expect(url).toContain('magiceden.io')
    expect(url).toContain(mint.toBase58())
    expect(url).toBe(`https://magiceden.io/item-details/${mint.toBase58()}`)
  })
})

describe('magiceden.getCollectionUrl', () => {
  test('should return a URL containing the collection symbol', () => {
    const symbol = 'degods'
    const url = magiceden.getCollectionUrl(symbol)

    expect(url).toContain('magiceden.io/marketplace')
    expect(url).toContain(symbol)
    expect(url).toBe(`https://magiceden.io/marketplace/${symbol}`)
  })
})

describe('magiceden.formatPrice', () => {
  test('should format 1 SOL correctly', () => {
    expect(magiceden.formatPrice(1_000_000_000n)).toBe('1.0000 SOL')
  })

  test('should format 2.5 SOL correctly', () => {
    expect(magiceden.formatPrice(2_500_000_000n)).toBe('2.5000 SOL')
  })

  test('should format 0 lamports as 0.0000 SOL', () => {
    expect(magiceden.formatPrice(0n)).toBe('0.0000 SOL')
  })
})

// ---------------------------------------------------------------------------
// Tensor
// ---------------------------------------------------------------------------

describe('tensor.getListingUrl', () => {
  test('should return a URL containing tensor.trade and the mint address', () => {
    const mint = Keypair.generate().publicKey
    const url = tensor.getListingUrl(mint)

    expect(url).toContain('tensor.trade')
    expect(url).toContain(mint.toBase58())
    expect(url).toBe(`https://www.tensor.trade/item/${mint.toBase58()}`)
  })
})

describe('tensor.getCollectionUrl', () => {
  test('should return a URL containing the collection slug', () => {
    const slug = 'mad_lads'
    const url = tensor.getCollectionUrl(slug)

    expect(url).toContain('tensor.trade/trade')
    expect(url).toContain(slug)
    expect(url).toBe(`https://www.tensor.trade/trade/${slug}`)
  })
})

describe('tensor.formatPrice', () => {
  test('should format 1 SOL correctly', () => {
    expect(tensor.formatPrice(1_000_000_000n)).toBe('1.0000 SOL')
  })

  test('should format 2.5 SOL correctly', () => {
    expect(tensor.formatPrice(2_500_000_000n)).toBe('2.5000 SOL')
  })

  test('should format 0 lamports as 0.0000 SOL', () => {
    expect(tensor.formatPrice(0n)).toBe('0.0000 SOL')
  })
})

// ---------------------------------------------------------------------------
// Cross-Marketplace
// ---------------------------------------------------------------------------

describe('Cross-marketplace URL comparison', () => {
  test('same mint should produce different URLs for each marketplace', () => {
    const mint = Keypair.generate().publicKey
    const meUrl = magiceden.getListingUrl(mint)
    const tensorUrl = tensor.getListingUrl(mint)

    // Both contain the same mint but different domains
    expect(meUrl).not.toBe(tensorUrl)
    expect(meUrl).toContain(mint.toBase58())
    expect(tensorUrl).toContain(mint.toBase58())
    expect(meUrl).toContain('magiceden.io')
    expect(tensorUrl).toContain('tensor.trade')
  })

  test('same slug/symbol should produce different collection URLs', () => {
    const slug = 'okay_bears'
    const meUrl = magiceden.getCollectionUrl(slug)
    const tensorUrl = tensor.getCollectionUrl(slug)

    expect(meUrl).not.toBe(tensorUrl)
    expect(meUrl).toContain(slug)
    expect(tensorUrl).toContain(slug)
  })
})

// ---------------------------------------------------------------------------
// Format Price Edge Cases
// ---------------------------------------------------------------------------

describe('formatPrice edge cases', () => {
  test('should handle very small amounts (1 lamport)', () => {
    const result = magiceden.formatPrice(1n)
    expect(result).toBe('0.0000 SOL')
  })

  test('should handle large amounts (1,000,000 SOL)', () => {
    const lamports = 1_000_000_000_000_000n // 1 million SOL
    const result = tensor.formatPrice(lamports)
    expect(result).toBe('1000000.0000 SOL')
  })

  test('both marketplaces should produce identical formatted output for the same lamports', () => {
    const lamports = 3_141_592_653n
    expect(magiceden.formatPrice(lamports)).toBe(tensor.formatPrice(lamports))
    expect(magiceden.formatPrice(lamports)).toBe('3.1416 SOL')
  })
})

// ---------------------------------------------------------------------------
// Magic Eden — collectionId handling and HTTP error surfacing (fix #8)
// ---------------------------------------------------------------------------

describe('magiceden API error handling', () => {
  test('getCollectionStats keeps the raw string collection id (not a PublicKey)', async () => {
    // ME collectionId is an opaque string like "me-alpha-123", not a pubkey.
    // Wrapping it in `new PublicKey(...)` used to throw on real responses.
    mockFetchOnce(async () =>
      new Response(JSON.stringify({
        collectionId: 'me-collection-xyz',
        floorPrice: 1.5,
        volume24hr: 42,
        volumeAll: 1000,
        listedCount: 10,
        totalSupply: 100,
        uniqueHolders: 55,
        avgPrice24hr: 2,
      }), { status: 200 })
    )

    const stats = await magiceden.getCollectionStats('degods')
    expect(stats.collection).toBe('me-collection-xyz')
    expect(stats.floorPrice).toBe(1_500_000_000n)
  })

  test('getNFTActivity throws with status + marketplace name on non-ok responses', async () => {
    mockFetchOnce(async () => new Response('boom', { status: 500, statusText: 'Internal Server Error' }))

    await expect(
      magiceden.getNFTActivity(Keypair.generate().publicKey)
    ).rejects.toThrow(/Magic Eden API error 500/)
  })

  test('getNFTOffers throws on non-ok responses instead of returning []', async () => {
    mockFetchOnce(async () => new Response('nope', { status: 503, statusText: 'Service Unavailable' }))

    await expect(
      magiceden.getNFTOffers(Keypair.generate().publicKey)
    ).rejects.toThrow(/Magic Eden API error 503/)
  })

  test('getPopularCollections throws on non-ok responses', async () => {
    mockFetchOnce(async () => new Response('rate limited', { status: 429, statusText: 'Too Many Requests' }))

    await expect(magiceden.getPopularCollections()).rejects.toThrow(/Magic Eden API error 429/)
  })

  test('searchCollections throws on non-ok responses', async () => {
    mockFetchOnce(async () => new Response('bad gateway', { status: 502, statusText: 'Bad Gateway' }))

    await expect(magiceden.searchCollections('degods')).rejects.toThrow(/Magic Eden API error 502/)
  })

  test('genuine empty results still return empty arrays', async () => {
    mockFetchOnce(async () => new Response(JSON.stringify([]), { status: 200 }))

    const offers = await magiceden.getNFTOffers(Keypair.generate().publicKey)
    expect(offers).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Tensor — HTTP/GraphQL errors must propagate, not be swallowed (fix #8)
// ---------------------------------------------------------------------------

describe('tensor API error handling', () => {
  test('getCollectionStats throws on non-ok responses instead of returning null', async () => {
    mockFetchOnce(async () => new Response('down', { status: 500, statusText: 'Internal Server Error' }))

    await expect(tensor.getCollectionStats('mad_lads')).rejects.toThrow(/Tensor API error/)
  })

  test('getCollectionStats returns null only for a genuinely unknown collection', async () => {
    mockFetchOnce(async () =>
      new Response(JSON.stringify({ data: { instrumentTV2: null } }), { status: 200 })
    )

    const stats = await tensor.getCollectionStats('unknown_collection')
    expect(stats).toBeNull()
  })

  test('getNFTInfo propagates network exceptions instead of returning null', async () => {
    mockFetchOnce(async () => {
      throw new Error('fetch failed: connection refused')
    })

    await expect(
      tensor.getNFTInfo(Keypair.generate().publicKey)
    ).rejects.toThrow(/connection refused/)
  })

  test('getNFTInfo returns null only for a genuinely unknown mint', async () => {
    mockFetchOnce(async () =>
      new Response(JSON.stringify({ data: { mint: null } }), { status: 200 })
    )

    const info = await tensor.getNFTInfo(Keypair.generate().publicKey)
    expect(info).toBeNull()
  })

  test('getTrendingCollections throws on GraphQL errors instead of returning []', async () => {
    mockFetchOnce(async () =>
      new Response(JSON.stringify({ errors: [{ message: 'rate limit exceeded' }] }), { status: 200 })
    )

    await expect(tensor.getTrendingCollections()).rejects.toThrow(/rate limit exceeded/)
  })
})
