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
