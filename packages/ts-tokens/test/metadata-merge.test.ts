/**
 * Tests for metadata update merging — the fix for partial updates wiping
 * untouched on-chain fields.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import { mergeMetadataUpdates, truncateUtf8 } from '../src/nft/metadata-merge'
import type { DataV2 } from '../src/programs/token-metadata/types'

function currentData(overrides: Partial<DataV2> = {}): DataV2 {
  return {
    name: 'Original',
    symbol: 'ORIG',
    uri: 'https://example.com/original.json',
    sellerFeeBasisPoints: 750,
    creators: [
      { address: Keypair.generate().publicKey, verified: true, share: 100 },
    ],
    collection: { verified: true, key: Keypair.generate().publicKey },
    uses: null,
    ...overrides,
  }
}

describe('mergeMetadataUpdates', () => {
  test('a uri-only update preserves every other field', () => {
    const current = currentData()
    const { data, changed } = mergeMetadataUpdates(current, {
      uri: 'https://example.com/new.json',
    })

    expect(changed).toBe(true)
    expect(data.uri).toBe('https://example.com/new.json')
    expect(data.name).toBe('Original')
    expect(data.symbol).toBe('ORIG')
    expect(data.sellerFeeBasisPoints).toBe(750)
    expect(data.creators).toBe(current.creators) // preserved, verified flags intact
    expect(data.collection).toBe(current.collection) // not wiped
  })

  test('flags-only update reports no DataV2 change', () => {
    const current = currentData()
    const { data, changed } = mergeMetadataUpdates(current, { isMutable: false })

    expect(changed).toBe(false)
    // data still mirrors current so callers may ignore it when changed === false
    expect(data.name).toBe('Original')
  })

  test('new creators are inserted unverified', () => {
    const current = currentData()
    const newCreator = Keypair.generate().publicKey
    const { data } = mergeMetadataUpdates(current, {
      creators: [{ address: newCreator.toBase58(), share: 100 }],
    })

    expect(data.creators).toHaveLength(1)
    expect(data.creators![0].address.toBase58()).toBe(newCreator.toBase58())
    expect(data.creators![0].verified).toBe(false)
  })

  test('sellerFeeBasisPoints of 0 is applied (not treated as absent)', () => {
    const current = currentData()
    const { data, changed } = mergeMetadataUpdates(current, { sellerFeeBasisPoints: 0 })
    expect(changed).toBe(true)
    expect(data.sellerFeeBasisPoints).toBe(0)
  })
})

describe('truncateUtf8', () => {
  test('leaves short ASCII untouched', () => {
    expect(truncateUtf8('hello', 32)).toBe('hello')
  })

  test('truncates by bytes without splitting a multibyte character', () => {
    // '🎨' is 4 UTF-8 bytes; a 32-byte name limit must not split it.
    const emoji = '🎨'.repeat(10) // 40 bytes
    const out = truncateUtf8(emoji, 32)
    expect(Buffer.byteLength(out, 'utf8')).toBeLessThanOrEqual(32)
    // No replacement characters (would indicate a split codepoint)
    expect(out).not.toContain('�')
    expect(out).toBe('🎨'.repeat(8)) // 8 * 4 = 32 bytes
  })
})
