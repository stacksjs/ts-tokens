/**
 * Base58 Encoding/Decoding
 *
 * A minimal implementation of Base58 encoding compatible with Solana address
 * format. The core encode/decode use no dependencies; the Base58Check helpers
 * rely on the built-in `node:crypto` module for the SHA-256 checksum.
 */

import { createHash } from 'node:crypto'

/**
 * Base58 alphabet (Bitcoin/Solana variant)
 */
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const ALPHABET_MAP = new Map<string, number>()

// Build reverse lookup map
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_MAP.set(ALPHABET[i], i)
}

/**
 * Encode a Uint8Array to Base58 string
 *
 * @param buffer - The bytes to encode
 * @returns Base58 encoded string
 *
 * @example
 * ```ts
 * const bytes = new Uint8Array([1, 2, 3])
 * const encoded = encode(bytes) // "Ldp"
 * ```
 */
export function encode(buffer: Uint8Array): string {
  if (buffer.length === 0) {
    return ''
  }

  // Count leading zeros
  let zeros = 0
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    zeros++
  }

  // Convert to base58
  const size = Math.ceil(buffer.length * 138 / 100) + 1
  const b58 = new Uint8Array(size)

  let length = 0
  for (let i = zeros; i < buffer.length; i++) {
    let carry = buffer[i]
    let j = 0

    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 256 * b58[k]
      b58[k] = carry % 58
      carry = Math.floor(carry / 58)
    }

    length = j
  }

  // Skip leading zeros in base58 result
  let i = size - length
  while (i < size && b58[i] === 0) {
    i++
  }

  // Build result string
  let result = '1'.repeat(zeros)
  for (; i < size; i++) {
    result += ALPHABET[b58[i]]
  }

  return result
}

/**
 * Decode a Base58 string to Uint8Array
 *
 * @param str - The Base58 string to decode
 * @returns Decoded bytes
 * @throws Error if string contains invalid characters
 *
 * @example
 * ```ts
 * const decoded = decode("Ldp") // Uint8Array([1, 2, 3])
 * ```
 */
export function decode(str: string): Uint8Array {
  if (str.length === 0) {
    return new Uint8Array(0)
  }

  // Count leading '1's (zeros)
  let zeros = 0
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    zeros++
  }

  // Allocate enough space
  const size = Math.ceil(str.length * 733 / 1000) + 1
  const b256 = new Uint8Array(size)

  let length = 0
  for (let i = zeros; i < str.length; i++) {
    const value = ALPHABET_MAP.get(str[i])
    if (value === undefined) {
      throw new Error(`Invalid Base58 character: "${str[i]}" at position ${i}`)
    }

    let carry = value
    let j = 0

    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 58 * b256[k]
      b256[k] = carry % 256
      carry = Math.floor(carry / 256)
    }

    length = j
  }

  // Skip leading zeros in result
  let i = size - length
  while (i < size && b256[i] === 0) {
    i++
  }

  // Build result with leading zeros
  const result = new Uint8Array(zeros + (size - i))
  let j = zeros
  while (i < size) {
    result[j++] = b256[i++]
  }

  return result
}

/**
 * Check if a string is valid Base58
 *
 * @param str - String to validate
 * @returns True if valid Base58
 */
export function isValid(str: string): boolean {
  if (typeof str !== 'string' || str.length === 0) {
    return false
  }

  for (const char of str) {
    if (!ALPHABET_MAP.has(char)) {
      return false
    }
  }

  return true
}

/**
 * Check if a string is a valid Solana address (32 bytes in Base58)
 *
 * @param address - Address to validate
 * @returns True if valid Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!isValid(address)) {
    return false
  }

  try {
    const decoded = decode(address)
    return decoded.length === 32
  } catch {
    return false
  }
}

/**
 * Compute the 4-byte Base58Check checksum: the first four bytes of
 * sha256(sha256(payload)).
 */
function checksum(payload: Uint8Array): Uint8Array {
  const first = createHash('sha256').update(payload).digest()
  const second = createHash('sha256').update(first).digest()
  return new Uint8Array(second.subarray(0, 4))
}

/**
 * Encode bytes to Base58 with checksum (Bitcoin-style Base58Check).
 *
 * Appends the first 4 bytes of the double-SHA256 of the payload before
 * Base58-encoding, so the result can be integrity-checked on decode.
 * Note: Solana addresses don't use checksums; this is for compatibility.
 *
 * @param buffer - Bytes to encode
 * @returns Base58Check encoded string
 */
export function encodeCheck(buffer: Uint8Array): string {
  const check = checksum(buffer)
  const combined = new Uint8Array(buffer.length + check.length)
  combined.set(buffer, 0)
  combined.set(check, buffer.length)
  return encode(combined)
}

/**
 * Decode a Base58Check string and verify its checksum.
 *
 * @param str - Base58Check string to decode
 * @returns Decoded payload bytes (without the checksum)
 * @throws Error if the string is too short or the checksum does not match
 */
export function decodeCheck(str: string): Uint8Array {
  const decoded = decode(str)

  if (decoded.length < 4) {
    throw new Error('Invalid Base58Check string: too short to contain a checksum')
  }

  const payload = decoded.subarray(0, decoded.length - 4)
  const expected = decoded.subarray(decoded.length - 4)
  const actual = checksum(payload)

  for (let i = 0; i < 4; i++) {
    if (expected[i] !== actual[i]) {
      throw new Error('Invalid Base58Check checksum')
    }
  }

  return new Uint8Array(payload)
}
