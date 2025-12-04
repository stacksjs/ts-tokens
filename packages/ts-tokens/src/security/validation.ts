/**
 * Validation Utilities
 *
 * Input validation for token operations.
 */

import { PublicKey } from '@solana/web3.js'

/**
 * Validate a Solana address
 */
export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

/**
 * Validate token name
 */
export function isValidTokenName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Name is required' }
  }
  if (name.length > 32) {
    return { valid: false, error: 'Name must be 32 characters or less' }
  }
  return { valid: true }
}

/**
 * Validate token symbol
 */
export function isValidTokenSymbol(symbol: string): { valid: boolean; error?: string } {
  if (!symbol || symbol.length === 0) {
    return { valid: false, error: 'Symbol is required' }
  }
  if (symbol.length > 10) {
    return { valid: false, error: 'Symbol must be 10 characters or less' }
  }
  return { valid: true }
}

/**
 * Validate decimals
 */
export function isValidDecimals(decimals: number): { valid: boolean; error?: string } {
  if (decimals < 0 || decimals > 9) {
    return { valid: false, error: 'Decimals must be between 0 and 9' }
  }
  if (!Number.isInteger(decimals)) {
    return { valid: false, error: 'Decimals must be an integer' }
  }
  return { valid: true }
}

/**
 * Validate basis points (royalty)
 */
export function isValidBasisPoints(bps: number): { valid: boolean; error?: string } {
  if (bps < 0 || bps > 10000) {
    return { valid: false, error: 'Basis points must be between 0 and 10000' }
  }
  if (!Number.isInteger(bps)) {
    return { valid: false, error: 'Basis points must be an integer' }
  }
  return { valid: true }
}

/**
 * Validate creator shares sum to 100
 */
export function isValidCreatorShares(shares: number[]): { valid: boolean; error?: string } {
  const total = shares.reduce((sum, share) => sum + share, 0)
  if (total !== 100) {
    return { valid: false, error: `Creator shares must sum to 100, got ${total}` }
  }
  for (const share of shares) {
    if (share < 0 || share > 100) {
      return { valid: false, error: 'Each share must be between 0 and 100' }
    }
  }
  return { valid: true }
}

/**
 * Validate URI format
 */
export function isValidUri(uri: string): { valid: boolean; error?: string } {
  if (!uri || uri.length === 0) {
    return { valid: false, error: 'URI is required' }
  }
  try {
    const url = new URL(uri)
    if (!['http:', 'https:', 'ipfs:', 'ar:'].includes(url.protocol)) {
      return { valid: false, error: 'URI must use http, https, ipfs, or ar protocol' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URI format' }
  }
}

/**
 * Validate amount is positive
 */
export function isValidAmount(amount: bigint | number): { valid: boolean; error?: string } {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount)
  if (value <= 0n) {
    return { valid: false, error: 'Amount must be greater than 0' }
  }
  return { valid: true }
}

/**
 * Validate metadata JSON structure
 */
export function isValidMetadataJson(metadata: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (typeof metadata !== 'object' || metadata === null) {
    return { valid: false, errors: ['Metadata must be an object'] }
  }

  const meta = metadata as Record<string, unknown>

  if (typeof meta.name !== 'string') {
    errors.push('Metadata must have a name string')
  }

  if (typeof meta.symbol !== 'string') {
    errors.push('Metadata must have a symbol string')
  }

  if (meta.image && typeof meta.image !== 'string') {
    errors.push('Metadata image must be a string')
  }

  if (meta.attributes && !Array.isArray(meta.attributes)) {
    errors.push('Metadata attributes must be an array')
  }

  return { valid: errors.length === 0, errors }
}
