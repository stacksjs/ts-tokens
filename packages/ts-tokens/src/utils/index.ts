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
        const delay = baseDelay * Math.pow(2, attempt)
        await sleep(delay)
      }
    }
  }

  throw lastError
}

/**
 * Format lamports to SOL
 *
 * @param lamports - Amount in lamports
 * @param decimals - Number of decimal places to show
 * @returns Formatted SOL amount
 */
export function lamportsToSol(lamports: bigint | number, decimals: number = 9): string {
  const value = typeof lamports === 'bigint' ? lamports : BigInt(lamports)
  const sol = Number(value) / 1e9
  return sol.toFixed(decimals)
}

/**
 * Convert SOL to lamports
 *
 * @param sol - Amount in SOL
 * @returns Amount in lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1e9))
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
  const divisor = BigInt(10 ** decimals)
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
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
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
  } else {
    // Fallback for Node.js without Web Crypto
    for (let i = 0; i < 32; i++) {
      seed[i] = Math.floor(Math.random() * 256)
    }
  }
  return seed
}

/**
 * Convert hex string to Uint8Array
 *
 * @param hex - Hex string
 * @returns Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
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
