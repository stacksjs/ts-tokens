/**
 * Marketplace Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * NFT listing
 */
export interface NFTListing {
  mint: PublicKey
  seller: PublicKey
  price: bigint
  marketplace: MarketplaceType
  listingId: string
  expiry?: number
  tokenAccount?: PublicKey
}

/**
 * Supported marketplaces
 */
export type MarketplaceType = 'magiceden' | 'tensor' | 'opensea' | 'solanart' | 'hyperspace'

/**
 * List NFT options
 */
export interface ListNFTOptions {
  mint: PublicKey
  price: bigint
  expiry?: number
  marketplace?: MarketplaceType
}

/**
 * Buy NFT options
 */
export interface BuyNFTOptions {
  listing: NFTListing
  buyer: PublicKey
}

/**
 * Delist NFT options
 */
export interface DelistNFTOptions {
  mint: PublicKey
  marketplace: MarketplaceType
}

/**
 * NFT offer
 */
export interface NFTOffer {
  mint: PublicKey
  buyer: PublicKey
  price: bigint
  marketplace: MarketplaceType
  offerId: string
  expiry?: number
}

/**
 * Make offer options
 */
export interface MakeOfferOptions {
  mint: PublicKey
  price: bigint
  expiry?: number
  marketplace?: MarketplaceType
}

/**
 * Collection stats
 */
export interface CollectionStats {
  collection: PublicKey
  floorPrice: bigint
  volume24h: bigint
  volumeTotal: bigint
  listedCount: number
  totalSupply: number
  owners: number
  avgPrice24h: bigint
}

/**
 * NFT activity
 */
export interface NFTActivity {
  mint: PublicKey
  type: 'listing' | 'sale' | 'offer' | 'transfer' | 'burn'
  price?: bigint
  from: PublicKey
  to?: PublicKey
  timestamp: number
  signature: string
  marketplace?: MarketplaceType
}

/**
 * Royalty info
 */
export interface RoyaltyInfo {
  mint: PublicKey
  sellerFeeBasisPoints: number
  creators: Array<{
    address: PublicKey
    share: number
    verified: boolean
  }>
  enforcedByMarketplace: boolean
}

/**
 * Marketplace fees
 */
export interface MarketplaceFees {
  marketplace: MarketplaceType
  takerFeeBps: number
  makerFeeBps: number
  royaltyEnforced: boolean
}

// ============================================
// P2P Trading Types
// ============================================

/**
 * Payment currency
 */
export type PaymentCurrency = 'SOL' | 'SPL'

/**
 * Payment info
 */
export interface PaymentInfo {
  currency: PaymentCurrency
  mint?: PublicKey
  amount: bigint
}

// ============================================
// Local Listing Types
// ============================================

/**
 * Options for creating a local P2P listing
 */
export interface CreateListingOptions {
  mint: PublicKey
  price: bigint
  currency?: PaymentCurrency
  paymentMint?: PublicKey
  expiry?: number
}

/**
 * Local P2P listing record
 */
export interface LocalListing {
  id: string
  mint: PublicKey
  seller: PublicKey
  price: bigint
  currency: PaymentCurrency
  paymentMint?: PublicKey
  sellerTokenAccount: PublicKey
  delegated: boolean
  expiry?: number
  createdAt: number
  status: 'active' | 'sold' | 'cancelled'
}

/**
 * Options for executing a purchase
 */
export interface ExecutePurchaseOptions {
  listing: LocalListing
  buyer?: PublicKey
}

// ============================================
// Escrow Types
// ============================================

/**
 * Escrow status
 */
export type EscrowStatus = 'pending' | 'funded' | 'settled' | 'cancelled' | 'expired'

/**
 * Escrow record
 */
export interface EscrowRecord {
  id: string
  mint: PublicKey
  seller: PublicKey
  buyer?: PublicKey
  price: bigint
  currency: PaymentCurrency
  escrowAccount: PublicKey
  escrowTokenAccount: PublicKey
  status: EscrowStatus
  signatures: string[]
  expiry?: number
  createdAt: number
}

/**
 * Options for creating an escrow
 */
export interface CreateEscrowOptions {
  mint: PublicKey
  price: bigint
  currency?: PaymentCurrency
  paymentMint?: PublicKey
  expiry?: number
}

// ============================================
// Offer Types
// ============================================

/**
 * Local offer record
 */
export interface LocalOffer {
  id: string
  mint: PublicKey
  bidder: PublicKey
  price: bigint
  currency: PaymentCurrency
  expiry?: number
  createdAt: number
  status: 'active' | 'accepted' | 'rejected' | 'cancelled' | 'expired'
}

/**
 * Options for creating an offer
 */
export interface CreateOfferOptions {
  mint: PublicKey
  price: bigint
  currency?: PaymentCurrency
  paymentMint?: PublicKey
  expiry?: number
}

/**
 * Options for accepting an offer
 */
export interface AcceptOfferOptions {
  offer: LocalOffer
}

// ============================================
// Auction Types
// ============================================

/**
 * Auction type
 */
export type AuctionType = 'english' | 'dutch'

/**
 * Auction status
 */
export type AuctionStatus = 'pending' | 'active' | 'ended' | 'settled' | 'cancelled'

/**
 * Auction bid
 */
export interface AuctionBid {
  bidder: PublicKey
  amount: bigint
  timestamp: number
}

/**
 * Auction record
 */
export interface AuctionRecord {
  id: string
  mint: PublicKey
  seller: PublicKey
  type: AuctionType
  status: AuctionStatus
  startPrice: bigint
  reservePrice?: bigint
  priceDecrement?: bigint
  decrementInterval?: number
  highestBid?: bigint
  highestBidder?: PublicKey
  bids: AuctionBid[]
  startTime: number
  endTime: number
  currency: PaymentCurrency
  escrowId?: string
  settleSignature?: string
  createdAt: number
}

/**
 * Options for creating an auction
 */
export interface CreateAuctionOptions {
  mint: PublicKey
  type: AuctionType
  startPrice: bigint
  reservePrice?: bigint
  duration: number
  priceDecrement?: bigint
  decrementInterval?: number
  currency?: PaymentCurrency
}

/**
 * Options for placing a bid
 */
export interface PlaceBidOptions {
  auctionId: string
  amount: bigint
}

// ============================================
// Royalty Distribution Types
// ============================================

/**
 * Individual royalty payment
 */
export interface RoyaltyPayment {
  creator: PublicKey
  share: number
  amount: bigint
  signature?: string
}

/**
 * Royalty distribution result
 */
export interface RoyaltyDistributionResult {
  totalRoyalty: bigint
  salePrice: bigint
  sellerFeeBasisPoints: number
  payments: RoyaltyPayment[]
  isPrimarySale: boolean
}

/**
 * Royalty calculation options
 */
export interface RoyaltyCalculationOptions {
  salePrice: bigint
  sellerFeeBasisPoints: number
  creators: Array<{ address: PublicKey; share: number }>
  isPrimarySale?: boolean
}

// ============================================
// Serialized types (for JSON persistence)
// ============================================

export interface SerializedListing {
  id: string
  mint: string
  seller: string
  price: string
  currency: PaymentCurrency
  paymentMint?: string
  sellerTokenAccount: string
  delegateSecret?: string
  delegated: boolean
  expiry?: number
  createdAt: number
  status: 'active' | 'sold' | 'cancelled'
}

export interface SerializedEscrow {
  id: string
  mint: string
  seller: string
  buyer?: string
  price: string
  currency: PaymentCurrency
  escrowAccount: string
  escrowTokenAccount: string
  escrowSecret: string
  status: EscrowStatus
  signatures: string[]
  expiry?: number
  createdAt: number
}

export interface SerializedOffer {
  id: string
  mint: string
  bidder: string
  price: string
  currency: PaymentCurrency
  expiry?: number
  createdAt: number
  status: 'active' | 'accepted' | 'rejected' | 'cancelled' | 'expired'
}

export interface SerializedAuction {
  id: string
  mint: string
  seller: string
  type: AuctionType
  status: AuctionStatus
  startPrice: string
  reservePrice?: string
  priceDecrement?: string
  decrementInterval?: number
  highestBid?: string
  highestBidder?: string
  bids: Array<{ bidder: string; amount: string; timestamp: number }>
  startTime: number
  endTime: number
  currency: PaymentCurrency
  escrowId?: string
  settleSignature?: string
  createdAt: number
}

/**
 * Full marketplace state shape
 */
export interface MarketplaceState {
  listings: Record<string, SerializedListing>
  offers: Record<string, SerializedOffer>
  escrows: Record<string, SerializedEscrow>
  auctions: Record<string, SerializedAuction>
}
