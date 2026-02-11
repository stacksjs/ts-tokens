/**
 * Marketplace State Store
 *
 * Local JSON file store for listings, offers, escrows, and auctions.
 * Reuses patterns from src/batch/recovery.ts.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { PublicKey, Keypair } from '@solana/web3.js'
import type {
  MarketplaceState,
  SerializedListing,
  SerializedEscrow,
  SerializedOffer,
  SerializedAuction,
  LocalListing,
  EscrowRecord,
  LocalOffer,
  AuctionRecord,
} from './types'

/**
 * Get the default store path (~/.ts-tokens/marketplace-state.json)
 */
export function getDefaultStorePath(): string {
  return path.join(os.homedir(), '.ts-tokens', 'marketplace-state.json')
}

/**
 * Generate a unique ID for a record
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Create an empty marketplace state
 */
function createEmptyState(): MarketplaceState {
  return {
    listings: {},
    offers: {},
    escrows: {},
    auctions: {},
  }
}

/**
 * Load marketplace state from disk
 */
export function loadState(storePath?: string): MarketplaceState {
  const filePath = storePath ?? getDefaultStorePath()
  const resolved = path.resolve(filePath)

  if (!fs.existsSync(resolved)) {
    return createEmptyState()
  }

  const content = fs.readFileSync(resolved, 'utf-8')
  return JSON.parse(content) as MarketplaceState
}

/**
 * Save marketplace state to disk
 */
export function saveState(state: MarketplaceState, storePath?: string): string {
  const filePath = storePath ?? getDefaultStorePath()
  const resolved = path.resolve(filePath)
  const dir = path.dirname(resolved)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(resolved, JSON.stringify(state, null, 2), { mode: 0o600 })
  return resolved
}

// ============================================
// Listing CRUD
// ============================================

export function serializeListing(listing: LocalListing, delegateSecret?: string): SerializedListing {
  return {
    id: listing.id,
    mint: listing.mint.toBase58(),
    seller: listing.seller.toBase58(),
    price: listing.price.toString(),
    currency: listing.currency,
    paymentMint: listing.paymentMint?.toBase58(),
    sellerTokenAccount: listing.sellerTokenAccount.toBase58(),
    delegateSecret,
    delegated: listing.delegated,
    expiry: listing.expiry,
    createdAt: listing.createdAt,
    status: listing.status,
  }
}

export function deserializeListing(s: SerializedListing): LocalListing {
  return {
    id: s.id,
    mint: new PublicKey(s.mint),
    seller: new PublicKey(s.seller),
    price: BigInt(s.price),
    currency: s.currency,
    paymentMint: s.paymentMint ? new PublicKey(s.paymentMint) : undefined,
    sellerTokenAccount: new PublicKey(s.sellerTokenAccount),
    delegated: s.delegated,
    expiry: s.expiry,
    createdAt: s.createdAt,
    status: s.status,
  }
}

export function saveListing(listing: LocalListing, delegateSecret?: string, storePath?: string): void {
  const state = loadState(storePath)
  state.listings[listing.id] = serializeListing(listing, delegateSecret)
  saveState(state, storePath)
}

export function getListing(id: string, storePath?: string): LocalListing | null {
  const state = loadState(storePath)
  const s = state.listings[id]
  if (!s) return null
  return deserializeListing(s)
}

export function getListingDelegateKeypair(id: string, storePath?: string): Keypair | null {
  const state = loadState(storePath)
  const s = state.listings[id]
  if (!s?.delegateSecret) return null
  return Keypair.fromSecretKey(Buffer.from(s.delegateSecret, 'base64'))
}

export function getListingByMint(mint: string, storePath?: string): LocalListing | null {
  const state = loadState(storePath)
  for (const s of Object.values(state.listings)) {
    if (s.mint === mint && s.status === 'active') {
      return deserializeListing(s)
    }
  }
  return null
}

export function updateListingStatus(id: string, status: LocalListing['status'], storePath?: string): void {
  const state = loadState(storePath)
  const s = state.listings[id]
  if (s) {
    s.status = status
    saveState(state, storePath)
  }
}

export function getActiveListings(storePath?: string): LocalListing[] {
  const state = loadState(storePath)
  return Object.values(state.listings)
    .filter(s => s.status === 'active')
    .map(deserializeListing)
}

export function getListingsForSeller(seller: string, storePath?: string): LocalListing[] {
  const state = loadState(storePath)
  return Object.values(state.listings)
    .filter(s => s.seller === seller)
    .map(deserializeListing)
}

// ============================================
// Escrow CRUD
// ============================================

export function serializeEscrow(escrow: EscrowRecord, escrowSecret: string): SerializedEscrow {
  return {
    id: escrow.id,
    mint: escrow.mint.toBase58(),
    seller: escrow.seller.toBase58(),
    buyer: escrow.buyer?.toBase58(),
    price: escrow.price.toString(),
    currency: escrow.currency,
    escrowAccount: escrow.escrowAccount.toBase58(),
    escrowTokenAccount: escrow.escrowTokenAccount.toBase58(),
    escrowSecret,
    status: escrow.status,
    signatures: escrow.signatures,
    expiry: escrow.expiry,
    createdAt: escrow.createdAt,
  }
}

export function deserializeEscrow(s: SerializedEscrow): EscrowRecord {
  return {
    id: s.id,
    mint: new PublicKey(s.mint),
    seller: new PublicKey(s.seller),
    buyer: s.buyer ? new PublicKey(s.buyer) : undefined,
    price: BigInt(s.price),
    currency: s.currency,
    escrowAccount: new PublicKey(s.escrowAccount),
    escrowTokenAccount: new PublicKey(s.escrowTokenAccount),
    status: s.status,
    signatures: s.signatures,
    expiry: s.expiry,
    createdAt: s.createdAt,
  }
}

export function saveEscrow(escrow: EscrowRecord, escrowSecret: string, storePath?: string): void {
  const state = loadState(storePath)
  state.escrows[escrow.id] = serializeEscrow(escrow, escrowSecret)
  saveState(state, storePath)
}

export function getEscrow(id: string, storePath?: string): EscrowRecord | null {
  const state = loadState(storePath)
  const s = state.escrows[id]
  if (!s) return null
  return deserializeEscrow(s)
}

export function getEscrowKeypair(id: string, storePath?: string): Keypair | null {
  const state = loadState(storePath)
  const s = state.escrows[id]
  if (!s?.escrowSecret) return null
  return Keypair.fromSecretKey(Buffer.from(s.escrowSecret, 'base64'))
}

export function updateEscrowStatus(id: string, status: EscrowRecord['status'], storePath?: string): void {
  const state = loadState(storePath)
  const s = state.escrows[id]
  if (s) {
    s.status = status
    saveState(state, storePath)
  }
}

export function updateEscrowBuyer(id: string, buyer: string, storePath?: string): void {
  const state = loadState(storePath)
  const s = state.escrows[id]
  if (s) {
    s.buyer = buyer
    saveState(state, storePath)
  }
}

export function addEscrowSignature(id: string, signature: string, storePath?: string): void {
  const state = loadState(storePath)
  const s = state.escrows[id]
  if (s) {
    s.signatures.push(signature)
    saveState(state, storePath)
  }
}

// ============================================
// Offer CRUD
// ============================================

export function serializeOffer(offer: LocalOffer): SerializedOffer {
  return {
    id: offer.id,
    mint: offer.mint.toBase58(),
    bidder: offer.bidder.toBase58(),
    price: offer.price.toString(),
    currency: offer.currency,
    expiry: offer.expiry,
    createdAt: offer.createdAt,
    status: offer.status,
  }
}

export function deserializeOffer(s: SerializedOffer): LocalOffer {
  return {
    id: s.id,
    mint: new PublicKey(s.mint),
    bidder: new PublicKey(s.bidder),
    price: BigInt(s.price),
    currency: s.currency,
    expiry: s.expiry,
    createdAt: s.createdAt,
    status: s.status,
  }
}

export function saveOffer(offer: LocalOffer, storePath?: string): void {
  const state = loadState(storePath)
  state.offers[offer.id] = serializeOffer(offer)
  saveState(state, storePath)
}

export function getOffer(id: string, storePath?: string): LocalOffer | null {
  const state = loadState(storePath)
  const s = state.offers[id]
  if (!s) return null
  return deserializeOffer(s)
}

export function updateOfferStatus(id: string, status: LocalOffer['status'], storePath?: string): void {
  const state = loadState(storePath)
  const s = state.offers[id]
  if (s) {
    s.status = status
    saveState(state, storePath)
  }
}

export function getOffersForMint(mint: string, storePath?: string): LocalOffer[] {
  const state = loadState(storePath)
  return Object.values(state.offers)
    .filter(s => s.mint === mint && s.status === 'active')
    .map(deserializeOffer)
}

export function getOffersForBidder(bidder: string, storePath?: string): LocalOffer[] {
  const state = loadState(storePath)
  return Object.values(state.offers)
    .filter(s => s.bidder === bidder)
    .map(deserializeOffer)
}

// ============================================
// Auction CRUD
// ============================================

export function serializeAuction(auction: AuctionRecord): SerializedAuction {
  return {
    id: auction.id,
    mint: auction.mint.toBase58(),
    seller: auction.seller.toBase58(),
    type: auction.type,
    status: auction.status,
    startPrice: auction.startPrice.toString(),
    reservePrice: auction.reservePrice?.toString(),
    priceDecrement: auction.priceDecrement?.toString(),
    decrementInterval: auction.decrementInterval,
    highestBid: auction.highestBid?.toString(),
    highestBidder: auction.highestBidder?.toBase58(),
    bids: auction.bids.map(b => ({
      bidder: b.bidder.toBase58(),
      amount: b.amount.toString(),
      timestamp: b.timestamp,
    })),
    startTime: auction.startTime,
    endTime: auction.endTime,
    currency: auction.currency,
    escrowId: auction.escrowId,
    settleSignature: auction.settleSignature,
    createdAt: auction.createdAt,
  }
}

export function deserializeAuction(s: SerializedAuction): AuctionRecord {
  return {
    id: s.id,
    mint: new PublicKey(s.mint),
    seller: new PublicKey(s.seller),
    type: s.type,
    status: s.status,
    startPrice: BigInt(s.startPrice),
    reservePrice: s.reservePrice ? BigInt(s.reservePrice) : undefined,
    priceDecrement: s.priceDecrement ? BigInt(s.priceDecrement) : undefined,
    decrementInterval: s.decrementInterval,
    highestBid: s.highestBid ? BigInt(s.highestBid) : undefined,
    highestBidder: s.highestBidder ? new PublicKey(s.highestBidder) : undefined,
    bids: s.bids.map(b => ({
      bidder: new PublicKey(b.bidder),
      amount: BigInt(b.amount),
      timestamp: b.timestamp,
    })),
    startTime: s.startTime,
    endTime: s.endTime,
    currency: s.currency,
    escrowId: s.escrowId,
    settleSignature: s.settleSignature,
    createdAt: s.createdAt,
  }
}

export function saveAuction(auction: AuctionRecord, storePath?: string): void {
  const state = loadState(storePath)
  state.auctions[auction.id] = serializeAuction(auction)
  saveState(state, storePath)
}

export function getAuction(id: string, storePath?: string): AuctionRecord | null {
  const state = loadState(storePath)
  const s = state.auctions[id]
  if (!s) return null
  return deserializeAuction(s)
}

export function updateAuctionStatus(id: string, status: AuctionRecord['status'], storePath?: string): void {
  const state = loadState(storePath)
  const s = state.auctions[id]
  if (s) {
    s.status = status
    saveState(state, storePath)
  }
}

export function updateAuctionBid(
  id: string,
  bidder: string,
  amount: string,
  timestamp: number,
  storePath?: string
): void {
  const state = loadState(storePath)
  const s = state.auctions[id]
  if (s) {
    s.bids.push({ bidder, amount, timestamp })
    s.highestBid = amount
    s.highestBidder = bidder
    saveState(state, storePath)
  }
}

export function updateAuctionSettle(id: string, signature: string, storePath?: string): void {
  const state = loadState(storePath)
  const s = state.auctions[id]
  if (s) {
    s.status = 'settled'
    s.settleSignature = signature
    saveState(state, storePath)
  }
}

export function getActiveAuctions(storePath?: string): AuctionRecord[] {
  const state = loadState(storePath)
  return Object.values(state.auctions)
    .filter(s => s.status === 'active' || s.status === 'pending')
    .map(deserializeAuction)
}

export function getEndedAuctions(storePath?: string): AuctionRecord[] {
  const state = loadState(storePath)
  return Object.values(state.auctions)
    .filter(s => s.status === 'ended')
    .map(deserializeAuction)
}

export function getAuctionsForSeller(seller: string, storePath?: string): AuctionRecord[] {
  const state = loadState(storePath)
  return Object.values(state.auctions)
    .filter(s => s.seller === seller)
    .map(deserializeAuction)
}

// ============================================
// Cleanup
// ============================================

/**
 * Remove expired listings, offers, escrows, and auctions
 */
export function cleanupExpired(storePath?: string): {
  listings: number
  offers: number
  escrows: number
  auctions: number
} {
  const state = loadState(storePath)
  const now = Date.now()
  let listings = 0
  let offers = 0
  let escrows = 0
  let auctions = 0

  for (const [id, listing] of Object.entries(state.listings)) {
    if (listing.status === 'active' && listing.expiry && listing.expiry < now) {
      state.listings[id].status = 'cancelled'
      listings++
    }
  }

  for (const [id, offer] of Object.entries(state.offers)) {
    if (offer.status === 'active' && offer.expiry && offer.expiry < now) {
      state.offers[id].status = 'expired'
      offers++
    }
  }

  for (const [id, escrow] of Object.entries(state.escrows)) {
    if ((escrow.status === 'pending' || escrow.status === 'funded') && escrow.expiry && escrow.expiry < now) {
      state.escrows[id].status = 'expired'
      escrows++
    }
  }

  for (const [id, auction] of Object.entries(state.auctions)) {
    if ((auction.status === 'active' || auction.status === 'pending') && auction.endTime < now) {
      state.auctions[id].status = 'ended'
      auctions++
    }
  }

  saveState(state, storePath)
  return { listings, offers, escrows, auctions }
}
