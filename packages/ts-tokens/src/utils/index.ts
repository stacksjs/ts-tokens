/**
 * Utility Functions
 *
 * Common utilities used throughout ts-tokens.
 */

export * from './base58'

/**
 * Sleep for a specified duration
 *
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Result of the function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        await sleep(getRetryDelay(lastError, attempt, baseDelay))
      }
    }
  }

  throw lastError
}

/**
 * Compute the delay before the next retry attempt.
 *
 * Honors server-provided Retry-After hints (rate limits / 429) attached to the
 * error by RPC/HTTP clients in common shapes (`error.retryAfter`,
 * `error.retry_after`, or a `retry-after` header). Otherwise applies
 * exponential backoff with full jitter: a random delay in
 * `[0, baseDelay * 2^attempt]`, which avoids thundering-herd retries.
 */
function getRetryDelay(error: Error, attempt: number, baseDelay: number): number {
  const anyErr = error as any
  const retryAfter = anyErr?.retryAfter
    ?? anyErr?.retry_after
    ?? anyErr?.headers?.['retry-after']
    ?? (typeof anyErr?.headers?.get === 'function' ? anyErr.headers.get('retry-after') : undefined)

  if (retryAfter !== undefined && retryAfter !== null) {
    // Retry-After is specified in seconds (an HTTP-date is not supported —
    // fall through to backoff in that case).
    const seconds = typeof retryAfter === 'number' ? retryAfter : Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000 + Math.random() * 1000
    }
  }

  const ceiling = baseDelay * Math.pow(2, attempt)
  return Math.random() * ceiling
}

/**
 * Format lamports to SOL
 *
 * Uses bigint math end-to-end so values above Number.MAX_SAFE_INTEGER (2^53)
 * are rendered exactly. The fractional part is rounded half-up at `decimals`
 * (matching `Number.prototype.toFixed` closely enough for display).
 *
 * @param lamports - Amount in lamports
 * @param decimals - Number of decimal places to show
 * @returns Formatted SOL amount
 */
export function lamportsToSol(lamports: bigint | number, decimals: number = 9): string {
  if (typeof lamports === 'number' && !Number.isInteger(lamports)) {
    throw new Error(`lamportsToSol: lamports must be an integer, got ${lamports}`)
  }
  const value = typeof lamports === 'bigint' ? lamports : BigInt(lamports)
  const negative = value < 0n
  const abs = negative ? -value : value
  const whole = abs / 1_000_000_000n
  const fraction = abs % 1_000_000_000n
  const fracStr = fraction.toString().padStart(9, '0')

  if (decimals >= 9) {
    return `${negative ? '-' : ''}${whole.toString()}.${fracStr.padEnd(decimals, '0')}`
  }

  if (decimals <= 0) {
    // Round to a whole number using the first fraction digit.
    const rounded = Number(fracStr[0]) >= 5 ? whole + 1n : whole
    return `${negative ? '-' : ''}${rounded.toString()}`
  }

  let display = fracStr.slice(0, decimals)
  // Round half-up based on the first dropped digit.
  if (Number(fracStr[decimals]) >= 5) {
    const bumped = (BigInt(display) + 1n).toString().padStart(decimals, '0')
    if (bumped.length > decimals) {
      // Rounding carried into the whole part (e.g. 1.999… → 2.00).
      return `${negative ? '-' : ''}${(whole + 1n).toString()}.${'0'.repeat(decimals)}`
    }
    display = bumped
  }

  return `${negative ? '-' : ''}${whole.toString()}.${display}`
}

/**
 * Expand exponential notation (e.g. "1e-9") into a plain decimal string.
 * Non-exponential input is returned unchanged.
 */
function expandExponential(str: string): string {
  if (!/[eE]/.test(str)) return str
  const [mantissa, expPart] = str.split(/[eE]/)
  const exponent = parseInt(expPart, 10)
  if (!Number.isFinite(exponent)) {
    throw new Error(`Invalid numeric string: "${str}"`)
  }
  const negative = mantissa.startsWith('-')
  const unsigned = negative ? mantissa.slice(1) : mantissa
  const pointIndex = unsigned.indexOf('.')
  const intLen = pointIndex === -1 ? unsigned.length : pointIndex
  const digits = unsigned.replace('.', '')
  const newPoint = intLen + exponent

  let out: string
  if (newPoint <= 0) {
    out = `0.${'0'.repeat(-newPoint)}${digits}`
  } else if (newPoint >= digits.length) {
    out = digits + '0'.repeat(newPoint - digits.length)
  } else {
    out = `${digits.slice(0, newPoint)}.${digits.slice(newPoint)}`
  }
  return (negative ? '-' : '') + out
}

/**
 * Convert SOL to lamports
 *
 * Parses the decimal string representation instead of multiplying by 1e9, so
 * values like 1.005 convert exactly (1.005 * 1e9 is not representable in
 * binary floating point and used to produce 1004999999).
 *
 * @param sol - Amount in SOL
 * @returns Amount in lamports
 */
export function solToLamports(sol: number): bigint {
  if (typeof sol !== 'number' || Number.isNaN(sol) || !Number.isFinite(sol)) {
    throw new Error(`solToLamports: expected a finite number, got ${String(sol)}`)
  }
  if (sol < 0) {
    throw new Error(`solToLamports: SOL amount cannot be negative, got ${sol}`)
  }

  const [intPart, fracPart = ''] = expandExponential(String(sol)).split('.')
  // Truncate beyond 9 decimal places: a lamport is indivisible (floor semantics).
  const frac9 = fracPart.padEnd(9, '0').slice(0, 9)
  return BigInt(intPart) * 1_000_000_000n + BigInt(frac9)
}

/**
 * Format token amount with decimals
 *
 * @param amount - Raw token amount
 * @param decimals - Token decimals
 * @param displayDecimals - Number of decimals to display
 * @returns Formatted amount
 */
export function formatTokenAmount(
  amount: bigint | number,
  decimals: number,
  displayDecimals?: number
): string {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount)
  const divisor = 10n ** BigInt(decimals)
  const whole = value / divisor
  const fraction = value % divisor

  const fractionStr = fraction.toString().padStart(decimals, '0')
  const display = displayDecimals !== undefined
    ? fractionStr.slice(0, displayDecimals)
    : fractionStr.replace(/0+$/, '')

  if (display === '') {
    return whole.toString()
  }

  return `${whole}.${display}`
}

/**
 * Parse token amount string to raw amount
 *
 * @param amount - Amount string (e.g., "1.5")
 * @param decimals - Token decimals
 * @returns Raw token amount
 * @throws On negative input, malformed input, or more decimal places than the
 *   mint supports (truncating money silently is never acceptable)
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const trimmed = amount.trim()

  if (trimmed.startsWith('-')) {
    throw new Error(`parseTokenAmount: amount cannot be negative, got "${amount}"`)
  }
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
    throw new Error(
      `parseTokenAmount: invalid amount "${amount}" — expected a non-negative decimal number like "12.5"`,
    )
  }

  const [whole, fraction = ''] = trimmed.split('.')
  if (fraction.length > decimals) {
    throw new Error(
      `parseTokenAmount: "${amount}" has too many decimal places ` +
      `(this mint supports at most ${decimals})`,
    )
  }

  const paddedFraction = fraction.padEnd(decimals, '0')
  return BigInt(whole + paddedFraction)
}

/**
 * Truncate an address for display
 *
 * @param address - Full address
 * @param startChars - Characters to show at start
 * @param endChars - Characters to show at end
 * @returns Truncated address
 */
export function truncateAddress(
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string {
  if (address.length <= startChars + endChars + 3) {
    return address
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Generate a random keypair seed
 *
 * @returns 32-byte random seed
 */
export function generateSeed(): Uint8Array {
  const seed = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(seed)
    return seed
  }
  // No secure RNG available. Degrading to Math.random() would produce
  // predictable key material, so refuse instead of returning insecure bytes.
  throw new Error(
    'generateSeed is not implemented: no cryptographically secure RNG available ' +
    '(crypto.getRandomValues is undefined in this environment)'
  )
}

/**
 * Convert hex string to Uint8Array
 *
 * @param hex - Hex string
 * @returns Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex

  if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
    throw new Error(
      'hexToBytes: invalid hex string — only the characters 0-9, a-f and A-F are allowed',
    )
  }
  if (cleanHex.length % 2 !== 0) {
    throw new Error(
      `hexToBytes: odd-length hex string (${cleanHex.length} characters) — ` +
      'hex input must contain complete byte pairs',
    )
  }

  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * Convert Uint8Array to hex string
 *
 * @param bytes - Uint8Array
 * @param prefix - Whether to add 0x prefix
 * @returns Hex string
 */
export function bytesToHex(bytes: Uint8Array, prefix: boolean = false): string {
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return prefix ? `0x${hex}` : hex
}

/**
 * Chunk an array into smaller arrays
 *
 * @param array - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Deep clone an object
 *
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined'
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined
}

/**
 * Get current timestamp in seconds
 */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * Calculate basis points to percentage
 *
 * @param basisPoints - Basis points (e.g., 500 = 5%)
 * @returns Percentage
 */
export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100
}

/**
 * Calculate percentage to basis points
 *
 * @param percent - Percentage (e.g., 5 = 5%)
 * @returns Basis points
 */
export function percentToBasisPoints(percent: number): number {
  return Math.floor(percent * 100)
}

export * from './batch-rpc'
export * from './persistent-cache'
export * from './bundle-optimizer'
export * from './strict-types'
export * from './builder'
export * from './transaction-builder-ui'
export * from './config-watcher'
export * from './rpc-logger'
export * from './performance'
export * from './telemetry'
export * from './errors'
