/**
 * Cross-Marketplace Listing
 *
 * Utilities for listing NFTs across multiple marketplaces simultaneously.
 */

import { PublicKey } from '@solana/web3.js'

export type SupportedMarketplace = 'magiceden' | 'tensor' | 'opensea'

export interface CrossListingOptions {
  mint: PublicKey
  owner: PublicKey
  price: bigint
  marketplaces: SupportedMarketplace[]
  expirationDays?: number
}

export interface CrossListingResult {
  marketplace: SupportedMarketplace
  success: boolean
  listingId?: string
  error?: string
  url?: string
}

export interface CrossListingSummary {
  mint: string
  totalMarketplaces: number
  successfulListings: number
  failedListings: number
  results: CrossListingResult[]
}

/**
 * List an NFT across multiple marketplaces.
 *
 * Real cross-listing requires building and signing a listing transaction for
 * each marketplace (via that marketplace's instruction/tx API, with the owner's
 * wallet). No such transactions are built or sent here, so fabricating listing
 * IDs and URLs would report listings that do not exist. Fail loudly instead.
 */
export async function crossListNFT(
  _options: CrossListingOptions,
): Promise<CrossListingSummary> {
  throw new Error(
    'crossListNFT is not implemented: per-marketplace listing transactions are ' +
    'not built or signed, so no NFT is actually listed. Use the marketplace ' +
    'listOnMagicEden/listOnTensor helpers to build a real listing transaction.'
  )
}

/**
 * Cancel listings across all marketplaces.
 *
 * Real cancellation requires building and signing a delist transaction per
 * marketplace. None is built here, so returning success would falsely report
 * that active listings were cancelled. Fail loudly instead.
 */
export async function cancelCrossListings(
  _mint: PublicKey,
  _marketplaces: SupportedMarketplace[],
): Promise<CrossListingSummary> {
  throw new Error(
    'cancelCrossListings is not implemented: per-marketplace delist ' +
    'transactions are not built or signed, so no listing is actually cancelled. ' +
    'Use the marketplace delistFromMagicEden/delistFromTensor helpers.'
  )
}

/**
 * Get the best price across marketplaces for an NFT.
 *
 * Requires querying each marketplace's price API and comparing results. That
 * aggregation is not implemented; returning null would masquerade as "no
 * listings found". Fail loudly instead.
 */
export async function getBestPrice(
  _mint: PublicKey,
  _marketplaces: SupportedMarketplace[] = ['magiceden', 'tensor'],
): Promise<{ marketplace: SupportedMarketplace; price: bigint } | null> {
  throw new Error(
    'getBestPrice is not implemented: cross-marketplace price aggregation is ' +
    'not wired up. Query each marketplace API directly (e.g. tensor.getNFTInfo).'
  )
}
