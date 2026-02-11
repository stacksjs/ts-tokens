import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import {
  isValidAddress,
  isValidTokenName,
  isValidTokenSymbol,
  isValidDecimals,
  isValidBasisPoints,
  isValidCreatorShares,
  isValidUri,
  isValidAmount,
  isValidMetadataJson,
} from '../src/security/validation'

describe('isValidAddress', () => {
  test('returns true for valid pubkey', () => {
    const kp = Keypair.generate()
    expect(isValidAddress(kp.publicKey.toBase58())).toBe(true)
  })

  test('returns true for system program', () => {
    expect(isValidAddress('11111111111111111111111111111111')).toBe(true)
  })

  test('returns false for garbage string', () => {
    expect(isValidAddress('not-a-key')).toBe(false)
  })

  test('returns false for empty string', () => {
    expect(isValidAddress('')).toBe(false)
  })
})

describe('isValidTokenName', () => {
  test('valid short name', () => {
    expect(isValidTokenName('My Token')).toEqual({ valid: true })
  })

  test('valid name at max length (32)', () => {
    expect(isValidTokenName('A'.repeat(32))).toEqual({ valid: true })
  })

  test('invalid — empty', () => {
    const result = isValidTokenName('')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  test('invalid — too long', () => {
    const result = isValidTokenName('A'.repeat(33))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('32')
  })
})

describe('isValidTokenSymbol', () => {
  test('valid short symbol', () => {
    expect(isValidTokenSymbol('SOL')).toEqual({ valid: true })
  })

  test('valid symbol at max length (10)', () => {
    expect(isValidTokenSymbol('A'.repeat(10))).toEqual({ valid: true })
  })

  test('invalid — empty', () => {
    expect(isValidTokenSymbol('').valid).toBe(false)
  })

  test('invalid — too long', () => {
    const result = isValidTokenSymbol('A'.repeat(11))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('10')
  })
})

describe('isValidDecimals', () => {
  test('valid — 0', () => {
    expect(isValidDecimals(0)).toEqual({ valid: true })
  })

  test('valid — 9', () => {
    expect(isValidDecimals(9)).toEqual({ valid: true })
  })

  test('valid — 6', () => {
    expect(isValidDecimals(6)).toEqual({ valid: true })
  })

  test('invalid — negative', () => {
    expect(isValidDecimals(-1).valid).toBe(false)
  })

  test('invalid — 10', () => {
    expect(isValidDecimals(10).valid).toBe(false)
  })

  test('invalid — not an integer', () => {
    expect(isValidDecimals(1.5).valid).toBe(false)
  })
})

describe('isValidBasisPoints', () => {
  test('valid — 0', () => {
    expect(isValidBasisPoints(0)).toEqual({ valid: true })
  })

  test('valid — 10000', () => {
    expect(isValidBasisPoints(10000)).toEqual({ valid: true })
  })

  test('valid — 500', () => {
    expect(isValidBasisPoints(500)).toEqual({ valid: true })
  })

  test('invalid — negative', () => {
    expect(isValidBasisPoints(-1).valid).toBe(false)
  })

  test('invalid — over 10000', () => {
    expect(isValidBasisPoints(10001).valid).toBe(false)
  })

  test('invalid — not an integer', () => {
    expect(isValidBasisPoints(100.5).valid).toBe(false)
  })
})

describe('isValidCreatorShares', () => {
  test('valid — single creator with 100%', () => {
    expect(isValidCreatorShares([100])).toEqual({ valid: true })
  })

  test('valid — two creators summing to 100', () => {
    expect(isValidCreatorShares([60, 40])).toEqual({ valid: true })
  })

  test('invalid — shares do not sum to 100', () => {
    const result = isValidCreatorShares([50, 40])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('90')
  })

  test('invalid — negative share', () => {
    const result = isValidCreatorShares([-10, 110])
    expect(result.valid).toBe(false)
  })

  test('invalid — share over 100', () => {
    const result = isValidCreatorShares([101, -1])
    expect(result.valid).toBe(false)
  })
})

describe('isValidUri', () => {
  test('valid — https', () => {
    expect(isValidUri('https://example.com/meta.json')).toEqual({ valid: true })
  })

  test('valid — http', () => {
    expect(isValidUri('http://example.com/meta.json')).toEqual({ valid: true })
  })

  test('valid — ipfs protocol', () => {
    expect(isValidUri('ipfs://QmTest123')).toEqual({ valid: true })
  })

  test('valid — ar protocol', () => {
    expect(isValidUri('ar://abc123')).toEqual({ valid: true })
  })

  test('invalid — empty', () => {
    expect(isValidUri('').valid).toBe(false)
  })

  test('invalid — not a URL', () => {
    expect(isValidUri('not a url').valid).toBe(false)
  })

  test('invalid — unsupported protocol', () => {
    const result = isValidUri('ftp://example.com/file')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('protocol')
  })
})

describe('isValidAmount', () => {
  test('valid — positive bigint', () => {
    expect(isValidAmount(100n)).toEqual({ valid: true })
  })

  test('valid — positive number', () => {
    expect(isValidAmount(1)).toEqual({ valid: true })
  })

  test('invalid — zero', () => {
    expect(isValidAmount(0n).valid).toBe(false)
  })

  test('invalid — negative', () => {
    expect(isValidAmount(-1).valid).toBe(false)
  })
})

describe('isValidMetadataJson', () => {
  test('valid metadata with name and symbol', () => {
    const result = isValidMetadataJson({ name: 'Test', symbol: 'TST' })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  test('valid metadata with all optional fields', () => {
    const result = isValidMetadataJson({
      name: 'Test',
      symbol: 'TST',
      image: 'https://example.com/img.png',
      attributes: [{ trait_type: 'color', value: 'red' }],
    })
    expect(result.valid).toBe(true)
  })

  test('invalid — null', () => {
    const result = isValidMetadataJson(null)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Metadata must be an object')
  })

  test('invalid — missing name', () => {
    const result = isValidMetadataJson({ symbol: 'TST' })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('name'))).toBe(true)
  })

  test('invalid — missing symbol', () => {
    const result = isValidMetadataJson({ name: 'Test' })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('symbol'))).toBe(true)
  })

  test('invalid — image is not a string', () => {
    const result = isValidMetadataJson({ name: 'Test', symbol: 'TST', image: 123 })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('image'))).toBe(true)
  })

  test('invalid — attributes is not an array', () => {
    const result = isValidMetadataJson({ name: 'Test', symbol: 'TST', attributes: 'wrong' })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('attributes'))).toBe(true)
  })

  test('invalid — not an object', () => {
    const result = isValidMetadataJson('string')
    expect(result.valid).toBe(false)
  })
})
