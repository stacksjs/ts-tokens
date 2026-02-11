import { describe, test, expect } from 'bun:test'
import { encode, decode, isValid, isValidSolanaAddress, encodeCheck, decodeCheck } from '../src/utils/base58'

describe('Base58 — encode', () => {
  test('encodes empty buffer to empty string', () => {
    expect(encode(new Uint8Array(0))).toBe('')
  })

  test('encodes a single zero byte as "1"', () => {
    expect(encode(new Uint8Array([0]))).toBe('1')
  })

  test('encodes multiple leading zeros', () => {
    const result = encode(new Uint8Array([0, 0, 0, 1]))
    expect(result.startsWith('111')).toBe(true)
  })

  test('encodes known bytes to expected Base58', () => {
    // "Hello" in ASCII
    const hello = new TextEncoder().encode('Hello')
    const encoded = encode(hello)
    expect(typeof encoded).toBe('string')
    expect(encoded.length).toBeGreaterThan(0)
    // round-trip
    expect(decode(encoded)).toEqual(hello)
  })

  test('encode → decode round-trip for random bytes', () => {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const encoded = encode(bytes)
    const decoded = decode(encoded)
    expect(decoded).toEqual(bytes)
  })

  test('encodes [1, 2, 3] deterministically', () => {
    const a = encode(new Uint8Array([1, 2, 3]))
    const b = encode(new Uint8Array([1, 2, 3]))
    expect(a).toBe(b)
  })
})

describe('Base58 — decode', () => {
  test('decodes empty string to empty Uint8Array', () => {
    const result = decode('')
    expect(result).toEqual(new Uint8Array(0))
  })

  test('decodes "1" to a single zero byte', () => {
    const result = decode('1')
    expect(result).toEqual(new Uint8Array([0]))
  })

  test('throws on invalid Base58 characters', () => {
    expect(() => decode('0OIl')).toThrow('Invalid Base58 character')
  })

  test('throws with character position in error message', () => {
    expect(() => decode('abc0')).toThrow('position 3')
  })

  test('decodes leading "1"s as zero bytes', () => {
    const result = decode('111Ldp')
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(0)
  })
})

describe('Base58 — isValid', () => {
  test('returns true for valid Base58 strings', () => {
    expect(isValid('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')).toBe(true)
  })

  test('returns false for strings with invalid characters', () => {
    expect(isValid('0OIl')).toBe(false)
  })

  test('returns false for empty string', () => {
    expect(isValid('')).toBe(false)
  })

  test('returns false for non-string input', () => {
    expect(isValid(123 as unknown as string)).toBe(false)
    expect(isValid(null as unknown as string)).toBe(false)
  })
})

describe('Base58 — isValidSolanaAddress', () => {
  test('returns true for a valid 32-byte address', () => {
    // System program address is a valid 32-byte pubkey
    expect(isValidSolanaAddress('11111111111111111111111111111111')).toBe(true)
  })

  test('returns false for a Base58 string that is not 32 bytes', () => {
    expect(isValidSolanaAddress('Ldp')).toBe(false) // too short
  })

  test('returns false for invalid characters', () => {
    expect(isValidSolanaAddress('0OIl' + 'A'.repeat(40))).toBe(false)
  })

  test('returns false for empty string', () => {
    expect(isValidSolanaAddress('')).toBe(false)
  })
})

describe('Base58 — encodeCheck / decodeCheck', () => {
  test('encodeCheck round-trips through decodeCheck', () => {
    const data = new Uint8Array([10, 20, 30, 40, 50])
    const encoded = encodeCheck(data)
    const decoded = decodeCheck(encoded)
    expect(decoded).toEqual(data)
  })

  test('encodeCheck produces a valid Base58 string', () => {
    const data = new Uint8Array([255, 128, 0])
    expect(isValid(encodeCheck(data))).toBe(true)
  })
})
