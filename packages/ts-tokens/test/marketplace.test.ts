/**
 * Marketplace Integration Tests
 *
 * Tests for pure utility functions exported by the Magic Eden and Tensor
 * marketplace modules: getListingUrl, getCollectionUrl, and formatPrice.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import * as magiceden from '../src/marketplace/magiceden'
import * as tensor from '../src/marketplace/tensor'

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
