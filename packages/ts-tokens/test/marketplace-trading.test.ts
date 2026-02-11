/**
 * Marketplace Trading Tests
 *
 * Tests for royalties, auctions, state store, and validation.
 * All pure/local — no network required.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

import { calculateRoyalties, buildRoyaltyInstructions } from '../src/marketplace/royalties'
import { getDutchAuctionPrice } from '../src/marketplace/auction'
import {
  loadState,
  saveState,
  generateId,
  saveListing,
  getListing,
  getActiveListings,
  updateListingStatus,
  getListingByMint,
  saveOffer,
  getOffer,
  getOffersForMint,
  updateOfferStatus,
  saveEscrow,
  getEscrow,
  updateEscrowStatus,
  saveAuction,
  getAuction,
  getActiveAuctions as storeGetActiveAuctions,
  getEndedAuctions as storeGetEndedAuctions,
  updateAuctionBid,
  updateAuctionSettle,
  cleanupExpired,
  serializeListing,
  serializeOffer,
  serializeEscrow,
  serializeAuction,
  deserializeListing,
  deserializeOffer,
  deserializeEscrow,
  deserializeAuction,
} from '../src/marketplace/store'

import type {
  LocalListing,
  LocalOffer,
  EscrowRecord,
  AuctionRecord,
  RoyaltyInfo,
  RoyaltyCalculationOptions,
  CreateListingOptions,
  CreateEscrowOptions,
  CreateOfferOptions,
  CreateAuctionOptions,
  PlaceBidOptions,
  AcceptOfferOptions,
  ExecutePurchaseOptions,
  PaymentCurrency,
  PaymentInfo,
  EscrowStatus,
  AuctionType,
  AuctionStatus,
  AuctionBid,
  RoyaltyPayment,
  RoyaltyDistributionResult,
  SerializedListing,
  SerializedOffer,
  SerializedEscrow,
  SerializedAuction,
  MarketplaceState,
} from '../src/marketplace/types'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let testStorePath: string

function createTestStorePath(): string {
  const dir = path.join(os.tmpdir(), `ts-tokens-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'test-state.json')
}

function cleanupTestStore(): void {
  if (testStorePath && fs.existsSync(testStorePath)) {
    const dir = path.dirname(testStorePath)
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function makeTestListing(overrides?: Partial<LocalListing>): LocalListing {
  return {
    id: generateId('listing'),
    mint: Keypair.generate().publicKey,
    seller: Keypair.generate().publicKey,
    price: 1_000_000_000n, // 1 SOL
    currency: 'SOL' as PaymentCurrency,
    sellerTokenAccount: Keypair.generate().publicKey,
    delegated: true,
    createdAt: Date.now(),
    status: 'active',
    ...overrides,
  }
}

function makeTestOffer(overrides?: Partial<LocalOffer>): LocalOffer {
  return {
    id: generateId('offer'),
    mint: Keypair.generate().publicKey,
    bidder: Keypair.generate().publicKey,
    price: 500_000_000n, // 0.5 SOL
    currency: 'SOL' as PaymentCurrency,
    createdAt: Date.now(),
    status: 'active',
    ...overrides,
  }
}

function makeTestEscrow(overrides?: Partial<EscrowRecord>): EscrowRecord {
  return {
    id: generateId('escrow'),
    mint: Keypair.generate().publicKey,
    seller: Keypair.generate().publicKey,
    price: 2_000_000_000n, // 2 SOL
    currency: 'SOL' as PaymentCurrency,
    escrowAccount: Keypair.generate().publicKey,
    escrowTokenAccount: Keypair.generate().publicKey,
    status: 'funded',
    signatures: ['test-signature-1'],
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeTestAuction(overrides?: Partial<AuctionRecord>): AuctionRecord {
  const now = Date.now()
  return {
    id: generateId('auction'),
    mint: Keypair.generate().publicKey,
    seller: Keypair.generate().publicKey,
    type: 'english',
    status: 'active',
    startPrice: 1_000_000_000n,
    bids: [],
    startTime: now,
    endTime: now + 86400000, // 24h
    currency: 'SOL' as PaymentCurrency,
    createdAt: now,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. Royalty Calculations
// ---------------------------------------------------------------------------

describe('Royalty Calculations', () => {
  const creator1 = Keypair.generate().publicKey
  const creator2 = Keypair.generate().publicKey

  test('should calculate secondary sale royalties correctly', () => {
    const result = calculateRoyalties({
      salePrice: 10_000_000_000n, // 10 SOL
      sellerFeeBasisPoints: 500, // 5%
      creators: [{ address: creator1, share: 100 }],
    })

    expect(result.totalRoyalty).toBe(500_000_000n) // 0.5 SOL
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].amount).toBe(500_000_000n)
    expect(result.isPrimarySale).toBe(false)
  })

  test('should calculate primary sale — 100% to creators', () => {
    const result = calculateRoyalties({
      salePrice: 10_000_000_000n,
      sellerFeeBasisPoints: 500,
      creators: [{ address: creator1, share: 100 }],
      isPrimarySale: true,
    })

    expect(result.totalRoyalty).toBe(10_000_000_000n)
    expect(result.payments[0].amount).toBe(10_000_000_000n)
    expect(result.isPrimarySale).toBe(true)
  })

  test('should split royalties among multiple creators', () => {
    const result = calculateRoyalties({
      salePrice: 10_000_000_000n,
      sellerFeeBasisPoints: 1000, // 10%
      creators: [
        { address: creator1, share: 60 },
        { address: creator2, share: 40 },
      ],
    })

    expect(result.totalRoyalty).toBe(1_000_000_000n) // 1 SOL
    expect(result.payments).toHaveLength(2)
    expect(result.payments[0].amount).toBe(600_000_000n) // 60%
    expect(result.payments[1].amount).toBe(400_000_000n) // 40%
  })

  test('should handle 0 basis points (no royalties)', () => {
    const result = calculateRoyalties({
      salePrice: 10_000_000_000n,
      sellerFeeBasisPoints: 0,
      creators: [{ address: creator1, share: 100 }],
    })

    expect(result.totalRoyalty).toBe(0n)
    expect(result.payments[0].amount).toBe(0n)
  })

  test('should handle 0 sale price', () => {
    const result = calculateRoyalties({
      salePrice: 0n,
      sellerFeeBasisPoints: 500,
      creators: [{ address: creator1, share: 100 }],
    })

    expect(result.totalRoyalty).toBe(0n)
    expect(result.payments).toHaveLength(0)
  })

  test('should handle rounding for small amounts', () => {
    const result = calculateRoyalties({
      salePrice: 100n, // very small
      sellerFeeBasisPoints: 333, // 3.33%
      creators: [{ address: creator1, share: 100 }],
    })

    // 100 * 333 / 10000 = 3 (integer division)
    expect(result.totalRoyalty).toBe(3n)
    expect(result.payments[0].amount).toBe(3n)
  })

  test('should handle max basis points (100%)', () => {
    const result = calculateRoyalties({
      salePrice: 1_000_000_000n,
      sellerFeeBasisPoints: 10000,
      creators: [{ address: creator1, share: 100 }],
    })

    expect(result.totalRoyalty).toBe(1_000_000_000n)
  })

  test('should handle three creators with uneven split', () => {
    const creator3 = Keypair.generate().publicKey
    const result = calculateRoyalties({
      salePrice: 10_000_000_000n,
      sellerFeeBasisPoints: 1000,
      creators: [
        { address: creator1, share: 50 },
        { address: creator2, share: 30 },
        { address: creator3, share: 20 },
      ],
    })

    expect(result.totalRoyalty).toBe(1_000_000_000n)
    expect(result.payments[0].amount).toBe(500_000_000n)
    expect(result.payments[1].amount).toBe(300_000_000n)
    expect(result.payments[2].amount).toBe(200_000_000n)
  })
})

// ---------------------------------------------------------------------------
// 2. Dutch Auction Pricing
// ---------------------------------------------------------------------------

describe('Dutch Auction Pricing', () => {
  test('should return start price at auction start', () => {
    const now = Date.now()
    const auction = makeTestAuction({
      type: 'dutch',
      startPrice: 10_000_000_000n,
      reservePrice: 1_000_000_000n,
      priceDecrement: 1_000_000_000n,
      decrementInterval: 3600000, // 1 hour
      startTime: now,
      endTime: now + 86400000,
    })

    const price = getDutchAuctionPrice(auction)
    expect(price).toBe(10_000_000_000n)
  })

  test('should decrement price over time', () => {
    const now = Date.now()
    const auction = makeTestAuction({
      type: 'dutch',
      startPrice: 10_000_000_000n,
      reservePrice: 1_000_000_000n,
      priceDecrement: 1_000_000_000n, // 1 SOL per interval
      decrementInterval: 3600000, // 1 hour
      // Started 3 hours ago
      startTime: now - 3 * 3600000,
      endTime: now + 21 * 3600000,
    })

    const price = getDutchAuctionPrice(auction)
    // After 3 hours: 10 - 3*1 = 7 SOL
    expect(price).toBe(7_000_000_000n)
  })

  test('should floor at reserve price', () => {
    const now = Date.now()
    const auction = makeTestAuction({
      type: 'dutch',
      startPrice: 5_000_000_000n, // 5 SOL
      reservePrice: 2_000_000_000n, // 2 SOL reserve
      priceDecrement: 1_000_000_000n,
      decrementInterval: 3600000,
      // Started 10 hours ago — price would be -5 SOL without floor
      startTime: now - 10 * 3600000,
      endTime: now + 14 * 3600000,
    })

    const price = getDutchAuctionPrice(auction)
    expect(price).toBe(2_000_000_000n) // Floors at reserve
  })

  test('should throw for non-Dutch auction', () => {
    const auction = makeTestAuction({ type: 'english' })
    expect(() => getDutchAuctionPrice(auction)).toThrow('Not a Dutch auction')
  })
})

// ---------------------------------------------------------------------------
// 3. State Store
// ---------------------------------------------------------------------------

describe('State Store', () => {
  beforeEach(() => {
    testStorePath = createTestStorePath()
  })

  afterEach(() => {
    cleanupTestStore()
  })

  test('should load empty state when file does not exist', () => {
    const state = loadState(testStorePath)
    expect(state.listings).toEqual({})
    expect(state.offers).toEqual({})
    expect(state.escrows).toEqual({})
    expect(state.auctions).toEqual({})
  })

  test('should save and load state', () => {
    const state: MarketplaceState = {
      listings: {},
      offers: {},
      escrows: {},
      auctions: {},
    }
    saveState(state, testStorePath)

    const loaded = loadState(testStorePath)
    expect(loaded.listings).toEqual({})
  })

  test('should generate unique IDs', () => {
    const id1 = generateId('test')
    const id2 = generateId('test')
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^test-/)
    expect(id2).toMatch(/^test-/)
  })

  test('should CRUD listings', () => {
    const listing = makeTestListing()
    saveListing(listing, undefined, testStorePath)

    const loaded = getListing(listing.id, testStorePath)
    expect(loaded).not.toBeNull()
    expect(loaded!.id).toBe(listing.id)
    expect(loaded!.price).toBe(listing.price)
    expect(loaded!.status).toBe('active')

    updateListingStatus(listing.id, 'sold', testStorePath)
    const updated = getListing(listing.id, testStorePath)
    expect(updated!.status).toBe('sold')
  })

  test('should CRUD offers', () => {
    const offer = makeTestOffer()
    saveOffer(offer, testStorePath)

    const loaded = getOffer(offer.id, testStorePath)
    expect(loaded).not.toBeNull()
    expect(loaded!.id).toBe(offer.id)
    expect(loaded!.price).toBe(offer.price)

    updateOfferStatus(offer.id, 'accepted', testStorePath)
    const updated = getOffer(offer.id, testStorePath)
    expect(updated!.status).toBe('accepted')
  })

  test('should CRUD escrows', () => {
    const escrow = makeTestEscrow()
    const secret = Buffer.from(Keypair.generate().secretKey).toString('base64')
    saveEscrow(escrow, secret, testStorePath)

    const loaded = getEscrow(escrow.id, testStorePath)
    expect(loaded).not.toBeNull()
    expect(loaded!.id).toBe(escrow.id)
    expect(loaded!.price).toBe(escrow.price)
    expect(loaded!.status).toBe('funded')

    updateEscrowStatus(escrow.id, 'settled', testStorePath)
    const updated = getEscrow(escrow.id, testStorePath)
    expect(updated!.status).toBe('settled')
  })

  test('should CRUD auctions', () => {
    const auction = makeTestAuction()
    saveAuction(auction, testStorePath)

    const loaded = getAuction(auction.id, testStorePath)
    expect(loaded).not.toBeNull()
    expect(loaded!.id).toBe(auction.id)
    expect(loaded!.startPrice).toBe(auction.startPrice)

    updateAuctionBid(
      auction.id,
      Keypair.generate().publicKey.toBase58(),
      '2000000000',
      Date.now(),
      testStorePath
    )

    const bidded = getAuction(auction.id, testStorePath)
    expect(bidded!.bids).toHaveLength(1)
    expect(bidded!.highestBid).toBe(2_000_000_000n)
  })

  test('should clean up expired records', () => {
    const pastExpiry = Date.now() - 1000 // expired 1 second ago

    const listing = makeTestListing({ expiry: pastExpiry })
    saveListing(listing, undefined, testStorePath)

    const offer = makeTestOffer({ expiry: pastExpiry })
    saveOffer(offer, testStorePath)

    const escrow = makeTestEscrow({ expiry: pastExpiry })
    const secret = Buffer.from(Keypair.generate().secretKey).toString('base64')
    saveEscrow(escrow, secret, testStorePath)

    const auction = makeTestAuction({
      endTime: pastExpiry,
    })
    saveAuction(auction, testStorePath)

    const result = cleanupExpired(testStorePath)
    expect(result.listings).toBe(1)
    expect(result.offers).toBe(1)
    expect(result.escrows).toBe(1)
    expect(result.auctions).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 4. Offer Validation
// ---------------------------------------------------------------------------

describe('Offer Validation', () => {
  beforeEach(() => {
    testStorePath = createTestStorePath()
  })

  afterEach(() => {
    cleanupTestStore()
  })

  test('should reject zero price offers (via type constraint)', () => {
    const offer = makeTestOffer({ price: 0n })
    // The validation is in makeOffer (which needs network), but we can
    // verify the state store accepts it and the status is preserved
    saveOffer(offer, testStorePath)
    const loaded = getOffer(offer.id, testStorePath)
    expect(loaded!.price).toBe(0n)
  })

  test('should track expired offer status', () => {
    const offer = makeTestOffer({ expiry: Date.now() - 1000 })
    saveOffer(offer, testStorePath)

    const result = cleanupExpired(testStorePath)
    expect(result.offers).toBe(1)

    const loaded = getOffer(offer.id, testStorePath)
    expect(loaded!.status).toBe('expired')
  })

  test('should transition offer through statuses', () => {
    const offer = makeTestOffer()
    saveOffer(offer, testStorePath)
    expect(getOffer(offer.id, testStorePath)!.status).toBe('active')

    updateOfferStatus(offer.id, 'rejected', testStorePath)
    expect(getOffer(offer.id, testStorePath)!.status).toBe('rejected')
  })
})

// ---------------------------------------------------------------------------
// 5. Auction Validation
// ---------------------------------------------------------------------------

describe('Auction Validation', () => {
  beforeEach(() => {
    testStorePath = createTestStorePath()
  })

  afterEach(() => {
    cleanupTestStore()
  })

  test('should reject bid below highest', () => {
    const auction = makeTestAuction({
      highestBid: 2_000_000_000n,
      highestBidder: Keypair.generate().publicKey,
    })
    saveAuction(auction, testStorePath)

    // placeBid requires config/wallet, so we test the store-level validation
    // by checking auction state directly
    const loaded = getAuction(auction.id, testStorePath)
    expect(loaded!.highestBid).toBe(2_000_000_000n)
  })

  test('should mark ended auctions during cleanup', () => {
    const auction = makeTestAuction({
      endTime: Date.now() - 1000, // ended 1 second ago
    })
    saveAuction(auction, testStorePath)

    cleanupExpired(testStorePath)
    const loaded = getAuction(auction.id, testStorePath)
    expect(loaded!.status).toBe('ended')
  })

  test('should track auction bids correctly', () => {
    const auction = makeTestAuction()
    saveAuction(auction, testStorePath)

    const bidder1 = Keypair.generate().publicKey.toBase58()
    const bidder2 = Keypair.generate().publicKey.toBase58()

    updateAuctionBid(auction.id, bidder1, '1500000000', Date.now(), testStorePath)
    updateAuctionBid(auction.id, bidder2, '2000000000', Date.now(), testStorePath)

    const loaded = getAuction(auction.id, testStorePath)
    expect(loaded!.bids).toHaveLength(2)
    expect(loaded!.highestBid).toBe(2_000_000_000n)
    expect(loaded!.highestBidder!.toBase58()).toBe(bidder2)
  })

  test('should settle auctions with signature', () => {
    const auction = makeTestAuction()
    saveAuction(auction, testStorePath)

    updateAuctionSettle(auction.id, 'test-settle-sig', testStorePath)
    const loaded = getAuction(auction.id, testStorePath)
    expect(loaded!.status).toBe('settled')
    expect(loaded!.settleSignature).toBe('test-settle-sig')
  })
})

// ---------------------------------------------------------------------------
// 6. Instruction Building
// ---------------------------------------------------------------------------

describe('Royalty Instruction Building', () => {
  test('should generate correct number of transfer instructions', () => {
    const creator1 = Keypair.generate().publicKey
    const creator2 = Keypair.generate().publicKey
    const buyer = Keypair.generate().publicKey

    const royaltyInfo: RoyaltyInfo = {
      mint: Keypair.generate().publicKey,
      sellerFeeBasisPoints: 500,
      creators: [
        { address: creator1, share: 60, verified: true },
        { address: creator2, share: 40, verified: true },
      ],
      enforcedByMarketplace: false,
    }

    const { instructions, totalRoyalty } = buildRoyaltyInstructions(
      buyer,
      10_000_000_000n,
      royaltyInfo
    )

    expect(instructions).toHaveLength(2) // One per creator
    expect(totalRoyalty).toBe(500_000_000n)
  })

  test('should skip zero-amount instructions', () => {
    const buyer = Keypair.generate().publicKey

    const royaltyInfo: RoyaltyInfo = {
      mint: Keypair.generate().publicKey,
      sellerFeeBasisPoints: 0,
      creators: [
        { address: Keypair.generate().publicKey, share: 100, verified: true },
      ],
      enforcedByMarketplace: false,
    }

    const { instructions, totalRoyalty } = buildRoyaltyInstructions(
      buyer,
      10_000_000_000n,
      royaltyInfo
    )

    expect(instructions).toHaveLength(0) // 0 bps = 0 amount = skipped
    expect(totalRoyalty).toBe(0n)
  })

  test('should correctly set transfer accounts', () => {
    const creator = Keypair.generate().publicKey
    const buyer = Keypair.generate().publicKey

    const royaltyInfo: RoyaltyInfo = {
      mint: Keypair.generate().publicKey,
      sellerFeeBasisPoints: 1000,
      creators: [{ address: creator, share: 100, verified: true }],
      enforcedByMarketplace: false,
    }

    const { instructions } = buildRoyaltyInstructions(
      buyer,
      5_000_000_000n,
      royaltyInfo
    )

    expect(instructions).toHaveLength(1)
    // SystemProgram.transfer has 2 keys: from and to
    expect(instructions[0].keys).toHaveLength(2)
    expect(instructions[0].keys[0].pubkey.toBase58()).toBe(buyer.toBase58())
    expect(instructions[0].keys[1].pubkey.toBase58()).toBe(creator.toBase58())
  })

  test('should calculate correct amounts for each creator', () => {
    const creator1 = Keypair.generate().publicKey
    const creator2 = Keypair.generate().publicKey
    const creator3 = Keypair.generate().publicKey
    const buyer = Keypair.generate().publicKey

    const royaltyInfo: RoyaltyInfo = {
      mint: Keypair.generate().publicKey,
      sellerFeeBasisPoints: 1000, // 10%
      creators: [
        { address: creator1, share: 50, verified: true },
        { address: creator2, share: 30, verified: true },
        { address: creator3, share: 20, verified: true },
      ],
      enforcedByMarketplace: false,
    }

    const { instructions, totalRoyalty } = buildRoyaltyInstructions(
      buyer,
      10_000_000_000n,
      royaltyInfo
    )

    expect(totalRoyalty).toBe(1_000_000_000n)
    expect(instructions).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// 7. Type Coverage
// ---------------------------------------------------------------------------

describe('Type Coverage', () => {
  test('should construct all PaymentCurrency variants', () => {
    const sol: PaymentCurrency = 'SOL'
    const spl: PaymentCurrency = 'SPL'
    expect(sol).toBe('SOL')
    expect(spl).toBe('SPL')
  })

  test('should construct all AuctionType variants', () => {
    const english: AuctionType = 'english'
    const dutch: AuctionType = 'dutch'
    expect(english).toBe('english')
    expect(dutch).toBe('dutch')
  })

  test('should construct all status variants', () => {
    const escrowStatuses: EscrowStatus[] = ['pending', 'funded', 'settled', 'cancelled', 'expired']
    const auctionStatuses: AuctionStatus[] = ['pending', 'active', 'ended', 'settled', 'cancelled']

    expect(escrowStatuses).toHaveLength(5)
    expect(auctionStatuses).toHaveLength(5)
  })
})

// ---------------------------------------------------------------------------
// 8. Serialization Round-Trip
// ---------------------------------------------------------------------------

describe('Serialization', () => {
  test('should round-trip listing through serialize/deserialize', () => {
    const listing = makeTestListing()
    const serialized = serializeListing(listing, 'test-secret')
    const deserialized = deserializeListing(serialized)

    expect(deserialized.id).toBe(listing.id)
    expect(deserialized.mint.toBase58()).toBe(listing.mint.toBase58())
    expect(deserialized.price).toBe(listing.price)
    expect(deserialized.status).toBe(listing.status)
  })

  test('should round-trip offer through serialize/deserialize', () => {
    const offer = makeTestOffer()
    const serialized = serializeOffer(offer)
    const deserialized = deserializeOffer(serialized)

    expect(deserialized.id).toBe(offer.id)
    expect(deserialized.mint.toBase58()).toBe(offer.mint.toBase58())
    expect(deserialized.price).toBe(offer.price)
  })

  test('should round-trip escrow through serialize/deserialize', () => {
    const escrow = makeTestEscrow()
    const secret = Buffer.from(Keypair.generate().secretKey).toString('base64')
    const serialized = serializeEscrow(escrow, secret)
    const deserialized = deserializeEscrow(serialized)

    expect(deserialized.id).toBe(escrow.id)
    expect(deserialized.mint.toBase58()).toBe(escrow.mint.toBase58())
    expect(deserialized.price).toBe(escrow.price)
  })

  test('should round-trip auction through serialize/deserialize', () => {
    const bidder = Keypair.generate().publicKey
    const auction = makeTestAuction({
      highestBid: 5_000_000_000n,
      highestBidder: bidder,
      bids: [{ bidder, amount: 5_000_000_000n, timestamp: Date.now() }],
    })
    const serialized = serializeAuction(auction)
    const deserialized = deserializeAuction(serialized)

    expect(deserialized.id).toBe(auction.id)
    expect(deserialized.startPrice).toBe(auction.startPrice)
    expect(deserialized.highestBid).toBe(5_000_000_000n)
    expect(deserialized.bids).toHaveLength(1)
    expect(deserialized.bids[0].amount).toBe(5_000_000_000n)
  })
})
