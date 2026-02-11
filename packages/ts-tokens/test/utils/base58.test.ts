import { describe, test, expect } from 'bun:test'
import {
  encode,
  decode,
  isValid,
  isValidSolanaAddress,
  encodeCheck,
  decodeCheck,
} from '../../src/utils/base58'

describe('Base58 — encode/decode round-trip', () => {
  test('round-trips a 32-byte random key', () => {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const encoded = encode(bytes)
    const decoded = decode(encoded)
    expect(decoded).toEqual(bytes)
  })

  test('round-trips a 64-byte keypair', () => {
    const bytes = new Uint8Array(64)
    crypto.getRandomValues(bytes)
    const encoded = encode(bytes)
    const decoded = decode(encoded)
    expect(decoded).toEqual(bytes)
  })

  test('round-trips single byte values 0-255', () => {
    for (let i = 0; i < 256; i++) {
      const bytes = new Uint8Array([i])
      const encoded = encode(bytes)
      const decoded = decode(encoded)
      expect(decoded).toEqual(bytes)
    }
  })

  test('round-trips through 100 random byte arrays of varying length', () => {
    for (let i = 0; i < 100; i++) {
      const len = Math.floor(Math.random() * 128) + 1
      const bytes = new Uint8Array(len)
      crypto.getRandomValues(bytes)
      const encoded = encode(bytes)
      const decoded = decode(encoded)
      expect(decoded).toEqual(bytes)
    }
  })
})

describe('Base58 — known Solana addresses', () => {
  test('System Program (all zeros = 32 "1"s)', () => {
    const systemProgram = '11111111111111111111111111111111'
    const decoded = decode(systemProgram)
    expect(decoded.length).toBe(32)
    expect(decoded.every(b => b === 0)).toBe(true)
    expect(encode(decoded)).toBe(systemProgram)
  })

  test('Token Program: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', () => {
    const tokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    const decoded = decode(tokenProgram)
    expect(decoded.length).toBe(32)
    // Re-encode should produce the same string
    expect(encode(decoded)).toBe(tokenProgram)
    expect(isValidSolanaAddress(tokenProgram)).toBe(true)
  })

  test('Token Metadata Program: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', () => {
    const metadataProgram = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    const decoded = decode(metadataProgram)
    expect(decoded.length).toBe(32)
    expect(encode(decoded)).toBe(metadataProgram)
    expect(isValidSolanaAddress(metadataProgram)).toBe(true)
  })

  test('Associated Token Program: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', () => {
    const ataProgram = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
    const decoded = decode(ataProgram)
    expect(decoded.length).toBe(32)
    expect(encode(decoded)).toBe(ataProgram)
    expect(isValidSolanaAddress(ataProgram)).toBe(true)
  })

  test('Bubblegum Program: BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY', () => {
    const bgum = 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
    const decoded = decode(bgum)
    expect(decoded.length).toBe(32)
    expect(encode(decoded)).toBe(bgum)
    expect(isValidSolanaAddress(bgum)).toBe(true)
  })
})

describe('Base58 — edge cases', () => {
  test('empty input encodes to empty string', () => {
    expect(encode(new Uint8Array(0))).toBe('')
  })

  test('empty string decodes to empty Uint8Array', () => {
    expect(decode('')).toEqual(new Uint8Array(0))
  })

  test('single zero byte encodes to "1"', () => {
    expect(encode(new Uint8Array([0]))).toBe('1')
  })

  test('"1" decodes to single zero byte', () => {
    expect(decode('1')).toEqual(new Uint8Array([0]))
  })

  test('leading zeros are preserved', () => {
    const bytes = new Uint8Array([0, 0, 0, 1, 2, 3])
    const encoded = encode(bytes)
    // Leading zeros map to leading '1's
    expect(encoded.startsWith('111')).toBe(true)
    const decoded = decode(encoded)
    expect(decoded).toEqual(bytes)
  })

  test('all zeros (various lengths)', () => {
    for (const len of [1, 2, 4, 8, 16, 32]) {
      const bytes = new Uint8Array(len)
      const encoded = encode(bytes)
      expect(encoded).toBe('1'.repeat(len))
      const decoded = decode(encoded)
      expect(decoded).toEqual(bytes)
    }
  })

  test('all 0xFF bytes', () => {
    const bytes = new Uint8Array(32).fill(0xff)
    const encoded = encode(bytes)
    expect(encoded.length).toBeGreaterThan(0)
    const decoded = decode(encoded)
    expect(decoded).toEqual(bytes)
  })

  test('decode throws on invalid character "0"', () => {
    expect(() => decode('0abc')).toThrow('Invalid Base58 character')
  })

  test('decode throws on invalid character "O"', () => {
    expect(() => decode('O')).toThrow('Invalid Base58 character')
  })

  test('decode throws on invalid character "I"', () => {
    expect(() => decode('I')).toThrow('Invalid Base58 character')
  })

  test('decode throws on invalid character "l"', () => {
    expect(() => decode('l')).toThrow('Invalid Base58 character')
  })

  test('decode includes position in error message', () => {
    expect(() => decode('abc0def')).toThrow('position 3')
  })

  test('encode is deterministic', () => {
    const bytes = new Uint8Array([42, 0, 255, 128, 1])
    const a = encode(bytes)
    const b = encode(bytes)
    expect(a).toBe(b)
  })
})

describe('Base58 — isValid', () => {
  test('full alphabet is valid', () => {
    expect(isValid('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')).toBe(true)
  })

  test('rejects "0" character', () => {
    expect(isValid('abc0')).toBe(false)
  })

  test('rejects "O" character', () => {
    expect(isValid('abcO')).toBe(false)
  })

  test('rejects "I" character', () => {
    expect(isValid('abcI')).toBe(false)
  })

  test('rejects "l" character', () => {
    expect(isValid('abcl')).toBe(false)
  })

  test('rejects empty string', () => {
    expect(isValid('')).toBe(false)
  })

  test('rejects non-string values', () => {
    expect(isValid(null as unknown as string)).toBe(false)
    expect(isValid(undefined as unknown as string)).toBe(false)
    expect(isValid(123 as unknown as string)).toBe(false)
  })

  test('rejects strings with spaces', () => {
    expect(isValid('abc def')).toBe(false)
  })

  test('rejects strings with special characters', () => {
    expect(isValid('abc+def')).toBe(false)
    expect(isValid('abc/def')).toBe(false)
  })
})

describe('Base58 — isValidSolanaAddress', () => {
  test('valid 32-byte addresses return true', () => {
    expect(isValidSolanaAddress('11111111111111111111111111111111')).toBe(true)
    expect(isValidSolanaAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')).toBe(true)
  })

  test('too short addresses return false', () => {
    expect(isValidSolanaAddress('Ldp')).toBe(false)
    expect(isValidSolanaAddress('abc')).toBe(false)
  })

  test('too long addresses return false (>44 chars typically means >32 bytes)', () => {
    // A valid 32-byte address is 32-44 chars in base58
    // Try to create something that decodes to >32 bytes
    const longBytes = new Uint8Array(64).fill(0xff)
    const longAddr = encode(longBytes)
    expect(isValidSolanaAddress(longAddr)).toBe(false)
  })

  test('empty string returns false', () => {
    expect(isValidSolanaAddress('')).toBe(false)
  })

  test('invalid characters return false', () => {
    expect(isValidSolanaAddress('0' + 'A'.repeat(43))).toBe(false)
  })
})

describe('Base58 — encodeCheck / decodeCheck', () => {
  test('encodeCheck/decodeCheck round-trip', () => {
    const data = new Uint8Array([10, 20, 30, 40, 50])
    const encoded = encodeCheck(data)
    const decoded = decodeCheck(encoded)
    expect(decoded).toEqual(data)
  })

  test('encodeCheck produces valid Base58', () => {
    const data = new Uint8Array([255, 128, 0, 64, 32])
    const encoded = encodeCheck(data)
    expect(isValid(encoded)).toBe(true)
  })

  test('encodeCheck/decodeCheck round-trip with 32 bytes', () => {
    const data = new Uint8Array(32)
    crypto.getRandomValues(data)
    const encoded = encodeCheck(data)
    const decoded = decodeCheck(encoded)
    expect(decoded).toEqual(data)
  })
})
