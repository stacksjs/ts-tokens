/**
 * Marketplace Integrations
 *
 * Helpers for NFT marketplaces and P2P trading.
 */

export * from './types'

// Re-export with namespaces to avoid conflicts
export * as magiceden from './magiceden'
export * as tensor from './tensor'

// P2P Trading — Direct Sales
export { listNFT, delistNFT, buyListedNFT, getActiveListings, getListingForMint } from './listing'

// P2P Trading — Escrow
export { createEscrow, settleEscrow, cancelEscrow, getEscrowInfo } from './escrow'

// P2P Trading — Offers
export { makeOffer, cancelOffer, acceptOffer, rejectOffer, getOffersForNFT } from './offers'

// P2P Trading — Auctions
export {
  createAuction,
  placeBid,
  getDutchAuctionPrice,
  buyDutchAuction,
  settleAuction,
  cancelAuction,
  getAuctionInfo,
  getActiveAuctions,
  getEndedAuctions,
} from './auction'

// Royalties
export {
  calculateRoyalties,
  getRoyaltyInfo,
  buildRoyaltyInstructions,
  buildSPLRoyaltyInstructions,
  detectRoyaltyBypass,
  markPrimarySale,
  getMetadataAddress,
} from './royalties'

// State Store
export { loadState, cleanupExpired } from './store'
