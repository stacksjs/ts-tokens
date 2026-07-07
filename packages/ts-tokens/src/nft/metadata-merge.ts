/**
 * Metadata update merging.
 *
 * UpdateMetadataAccountV2 replaces the whole DataV2 struct, so a partial update
 * must be merged over the current on-chain values. This module centralises that
 * merge so every update path (NFT, collection, batch) preserves the fields the
 * caller did not touch instead of blanking them.
 */

import { PublicKey } from '@solana/web3.js'
import type { DataV2, Creator } from '../programs/token-metadata/types'

/**
 * Fields a caller may change on an NFT/collection's metadata.
 */
export interface MetadataUpdates {
  name?: string
  symbol?: string
  uri?: string
  sellerFeeBasisPoints?: number
  creators?: Array<{ address: string; share: number }>
  primarySaleHappened?: boolean
  isMutable?: boolean
}

/**
 * Truncate a string to at most `maxBytes` UTF-8 bytes without splitting a
 * multibyte character. On-chain name/symbol/uri have fixed byte limits (32/10/
 * 200); a naive `String.slice` counts UTF-16 code units and can overflow those
 * limits (or split a character) for non-ASCII content.
 */
export function truncateUtf8(value: string, maxBytes: number): string {
  const buf = Buffer.from(value, 'utf8')
  if (buf.length <= maxBytes) return value

  let end = maxBytes
  // If the cut lands inside a multibyte sequence, back up to its start.
  while (end > 0 && (buf[end] & 0xc0) === 0x80) end--
  return buf.subarray(0, end).toString('utf8')
}

const NAME_MAX_BYTES = 32
const SYMBOL_MAX_BYTES = 10
const URI_MAX_BYTES = 200

/**
 * Merge `updates` over the current DataV2, preserving every field the caller did
 * not set (including collection, uses, and existing creators). Returns the merged
 * DataV2 and whether any DataV2 field actually changed (so callers can send
 * `data: None` when only primarySaleHappened/isMutable changed).
 *
 * Newly supplied creators are marked unverified — a creator must re-sign to
 * verify — while untouched creators keep their existing verification state.
 */
export function mergeMetadataUpdates(
  current: DataV2,
  updates: MetadataUpdates
): { data: DataV2; changed: boolean } {
  let changed = false

  let name = current.name
  if (updates.name !== undefined) {
    name = truncateUtf8(updates.name, NAME_MAX_BYTES)
    changed = true
  }

  let symbol = current.symbol
  if (updates.symbol !== undefined) {
    symbol = truncateUtf8(updates.symbol, SYMBOL_MAX_BYTES)
    changed = true
  }

  let uri = current.uri
  if (updates.uri !== undefined) {
    uri = truncateUtf8(updates.uri, URI_MAX_BYTES)
    changed = true
  }

  let sellerFeeBasisPoints = current.sellerFeeBasisPoints
  if (updates.sellerFeeBasisPoints !== undefined) {
    sellerFeeBasisPoints = updates.sellerFeeBasisPoints
    changed = true
  }

  let creators: Creator[] | null = current.creators
  if (updates.creators !== undefined) {
    creators = updates.creators.map(c => ({
      address: new PublicKey(c.address),
      verified: false,
      share: c.share,
    }))
    changed = true
  }

  return {
    data: {
      name,
      symbol,
      uri,
      sellerFeeBasisPoints,
      creators,
      // Never dropped: preserve the current collection and uses so a data update
      // (which must resend the whole DataV2) does not clear them.
      collection: current.collection,
      uses: current.uses,
    },
    changed,
  }
}
