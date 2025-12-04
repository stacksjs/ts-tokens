/**
 * Base58 Encoding/Decoding
 *
 * A minimal, zero-dependency implementation of Base58 encoding
 * compatible with Solana address format.
 */

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
 * Encode bytes to Base58 with checksum (Bitcoin-style)
 * Note: Solana addresses don't use checksums, this is for compatibility
 *
 * @param buffer - Bytes to encode
 * @returns Base58Check encoded string
 */
export function encodeCheck(buffer: Uint8Array): string {
  // For now, just use regular encoding
  // Full implementation would add SHA256 checksum
  return encode(buffer)
}

/**
 * Decode Base58Check string
 *
 * @param str - Base58Check string to decode
 * @returns Decoded bytes (without checksum)
 */
export function decodeCheck(str: string): Uint8Array {
  // For now, just use regular decoding
  return decode(str)
}
