/**
 * Auction System
 *
 * English auctions: ascending bids, highest bidder wins after endTime.
 * Dutch auctions: descending price, first buyer wins immediately.
 *
 * NFT is held in escrow during the auction. Bids are off-chain records.
 * Settlement is an atomic on-chain transaction.
 */

import {
  PublicKey,
  SystemProgram,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import type { CreateAuctionOptions, PlaceBidOptions, AuctionRecord } from './types'
import {
  generateId,
  saveAuction,
  getAuction,
  updateAuctionStatus,
  updateAuctionBid,
  updateAuctionSettle,
  getActiveAuctions as storeGetActiveAuctions,
  getEndedAuctions as storeGetEndedAuctions,
  getEscrowKeypair,
  getEscrow,
} from './store'
import { createEscrow } from './escrow'
import { getRoyaltyInfo, buildRoyaltyInstructions } from './royalties'

/**
 * Default settlement grace period for English auctions: 24 hours after
 * `endTime`. During the grace period only the winning bidder can settle (their
 * wallet pays the winning bid). After it, the seller may cancel the auction
 * even with bids present, so a non-settling top bidder cannot lock the
 * seller's NFT forever. Configurable per auction via
 * `CreateAuctionOptions.settleGracePeriod`.
 */
export const DEFAULT_SETTLE_GRACE_PERIOD_MS = 86_400_000

/**
 * Create an auction
 *
 * 1. Deposits NFT into escrow (reuses createEscrow)
 * 2. Creates auction record with type, times, pricing
 *
 * English auctions accept `options.settleGracePeriod` (ms, default 24h): the
 * window after `endTime` in which only the winner can settle before the seller
 * may cancel despite bids.
 */
export async function createAuction(
  options: CreateAuctionOptions,
  config: TokenConfig
): Promise<AuctionRecord> {
  if (options.type === 'dutch') {
    if (!options.priceDecrement || !options.decrementInterval) {
      throw new Error('Dutch auctions require priceDecrement and decrementInterval')
    }
    if (!options.reservePrice) {
      throw new Error('Dutch auctions require a reservePrice')
    }
  }

  if (options.startPrice <= 0n) {
    throw new Error('Start price must be greater than zero')
  }

  if (options.duration <= 0) {
    throw new Error('Duration must be greater than zero')
  }

  // Settlement pays the seller and creators with SystemProgram.transfer (SOL).
  // An SPL-priced auction would be settled in SOL lamports at the same numeric
  // value, drastically mispricing the sale, so reject non-SOL until SPL
  // settlement is implemented.
  if (options.currency && options.currency !== 'SOL') {
    throw new Error('Only SOL-denominated auctions are supported')
  }

  if (options.settleGracePeriod != null) {
    if (!Number.isFinite(options.settleGracePeriod) || options.settleGracePeriod < 0) {
      throw new Error('settleGracePeriod must be >= 0 milliseconds')
    }
  }

  // Deposit NFT into escrow
  const escrow = await createEscrow(
    {
      mint: options.mint,
      price: options.startPrice,
      currency: options.currency,
    },
    config
  )

  const now = Date.now()
  const auction: AuctionRecord = {
    id: generateId('auction'),
    mint: options.mint,
    seller: escrow.seller,
    type: options.type,
    status: 'active',
    startPrice: options.startPrice,
    reservePrice: options.reservePrice,
    priceDecrement: options.priceDecrement,
    decrementInterval: options.decrementInterval,
    bids: [],
    startTime: now,
    endTime: now + options.duration,
    settleGracePeriod: options.settleGracePeriod,
    currency: options.currency ?? 'SOL',
    escrowId: escrow.id,
    createdAt: now,
  }

  saveAuction(auction)
  return auction
}

/**
 * Place a bid on an English auction (off-chain)
 *
 * Validates: auction is active, bid > highest, auction not ended
 */
export function placeBid(
  options: PlaceBidOptions,
  config: TokenConfig
): AuctionRecord {
  const bidder = loadWallet(config)
  const auction = getAuction(options.auctionId)

  if (!auction) {
    throw new Error(`Auction not found: ${options.auctionId}`)
  }

  if (auction.type !== 'english') {
    throw new Error('Cannot place bids on Dutch auctions — use buyDutchAuction instead')
  }

  if (auction.status !== 'active') {
    throw new Error(`Auction is not active (status: ${auction.status})`)
  }

  if (Date.now() > auction.endTime) {
    updateAuctionStatus(options.auctionId, 'ended')
    throw new Error('Auction has ended')
  }

  if (options.amount <= 0n) {
    throw new Error('Bid amount must be greater than zero')
  }

  if (auction.highestBid && options.amount <= auction.highestBid) {
    throw new Error(
      `Bid must exceed current highest bid of ${auction.highestBid.toString()} lamports`
    )
  }

  if (options.amount < auction.startPrice) {
    throw new Error(
      `Bid must be at least the start price of ${auction.startPrice.toString()} lamports`
    )
  }

  updateAuctionBid(
    options.auctionId,
    bidder.publicKey.toBase58(),
    options.amount.toString(),
    Date.now()
  )

  // Re-fetch the updated auction
  return getAuction(options.auctionId)!
}

/**
 * Get the current price of a Dutch auction
 *
 * price = max(reservePrice, startPrice - floor(elapsed / interval) * decrement)
 */
export function getDutchAuctionPrice(auction: AuctionRecord): bigint {
  if (auction.type !== 'dutch') {
    throw new Error('Not a Dutch auction')
  }

  if (!auction.priceDecrement || !auction.decrementInterval || !auction.reservePrice) {
    throw new Error('Dutch auction missing pricing parameters')
  }

  const now = Date.now()
  const elapsed = Math.max(0, now - auction.startTime)
  const decrements = BigInt(Math.floor(elapsed / auction.decrementInterval))
  const reduction = decrements * auction.priceDecrement

  const computedPrice = auction.startPrice > reduction
    ? auction.startPrice - reduction
    : 0n

  // Floor at reserve price
  return computedPrice > auction.reservePrice ? computedPrice : auction.reservePrice
}

/**
 * Buy a Dutch auction at the current computed price
 *
 * Immediate settlement: atomic swap NFT -> buyer, SOL -> seller
 */
export async function buyDutchAuction(
  auctionId: string,
  config: TokenConfig
): Promise<{ signature: string; price: bigint; auction: AuctionRecord }> {
  const connection = createConnection(config)
  const buyer = loadWallet(config)

  const auction = getAuction(auctionId)
  if (!auction) {
    throw new Error(`Auction not found: ${auctionId}`)
  }

  if (auction.type !== 'dutch') {
    throw new Error('Not a Dutch auction — use settleAuction for English auctions')
  }

  if (auction.status !== 'active') {
    throw new Error(`Auction is not active (status: ${auction.status})`)
  }

  if (Date.now() > auction.endTime) {
    updateAuctionStatus(auctionId, 'ended')
    throw new Error('Auction has ended')
  }

  if (!auction.escrowId) {
    throw new Error('Auction has no escrow')
  }

  const currentPrice = getDutchAuctionPrice(auction)
  const escrow = getEscrow(auction.escrowId)
  if (!escrow) {
    throw new Error('Escrow not found')
  }

  const escrowKeypair = getEscrowKeypair(auction.escrowId)
  if (!escrowKeypair) {
    throw new Error('Escrow keypair not found')
  }

  const royaltyInfo = await getRoyaltyInfo(auction.mint, config)

  const instructions = []

  // Buyer ATA
  const buyerATA = await getAssociatedTokenAddress(
    auction.mint,
    buyer.publicKey,
    false,
    TOKEN_PROGRAM_ID
  )

  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      buyer.publicKey,
      buyerATA,
      buyer.publicKey,
      auction.mint,
      TOKEN_PROGRAM_ID
    )
  )

  // Royalties
  const { instructions: royaltyIxs, totalRoyalty } = buildRoyaltyInstructions(
    buyer.publicKey,
    currentPrice,
    royaltyInfo
  )
  // Defensive: royalties must never exceed the sale price. calculateRoyalties
  // validates and caps, but never build settlement instructions that would pay
  // creators more than the buyer spends.
  if (totalRoyalty > currentPrice) {
    throw new Error(
      `Computed royalty (${totalRoyalty}) exceeds sale price (${currentPrice}) — aborting settlement`
    )
  }
  instructions.push(...royaltyIxs)

  // SOL to seller
  const sellerAmount = currentPrice - totalRoyalty
  if (sellerAmount > 0n) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: buyer.publicKey,
        toPubkey: auction.seller,
        lamports: sellerAmount,
      })
    )
  }

  // NFT from escrow to buyer
  instructions.push(
    createTransferCheckedInstruction(
      escrow.escrowTokenAccount,
      auction.mint,
      buyerATA,
      escrowKeypair.publicKey,
      1n,
      0,
      [],
      TOKEN_PROGRAM_ID
    )
  )

  // Close escrow ATA
  instructions.push(
    createCloseAccountInstruction(
      escrow.escrowTokenAccount,
      auction.seller,
      escrowKeypair.publicKey,
      [],
      TOKEN_PROGRAM_ID
    )
  )

  const transaction = await buildTransaction(
    connection,
    instructions,
    buyer.publicKey
  )
  transaction.partialSign(buyer)
  transaction.partialSign(escrowKeypair)

  const result = await sendAndConfirmTransaction(connection, transaction)
  if (!result.confirmed) {
    throw new Error(
      `Failed to buy Dutch auction: ${result.error ?? 'transaction not confirmed'}`
    )
  }

  updateAuctionSettle(auctionId, result.signature)

  return {
    signature: result.signature,
    price: currentPrice,
    auction: { ...auction, status: 'settled', settleSignature: result.signature },
  }
}

/**
 * Settle an English auction after endTime
 *
 * Transfers NFT to highest bidder, SOL to seller (with royalties)
 */
export async function settleAuction(
  auctionId: string,
  config: TokenConfig
): Promise<{ signature: string; auction: AuctionRecord }> {
  const connection = createConnection(config)
  const caller = loadWallet(config)

  const auction = getAuction(auctionId)
  if (!auction) {
    throw new Error(`Auction not found: ${auctionId}`)
  }

  if (auction.type !== 'english') {
    throw new Error('Use buyDutchAuction for Dutch auctions')
  }

  if (auction.status === 'settled') {
    throw new Error('Auction already settled')
  }

  if (auction.status === 'cancelled') {
    throw new Error('Auction was cancelled')
  }

  if (Date.now() < auction.endTime) {
    throw new Error('Auction has not ended yet')
  }

  if (!auction.highestBidder || !auction.highestBid) {
    throw new Error('No bids placed — cancel the auction instead')
  }

  // Bids are off-chain records with no escrowed funds, so settlement must be
  // paid by the winner from their own wallet. If anyone else could settle, they
  // would pay the winning bid (and royalties) out of pocket while the NFT went
  // to the winner. Require the caller to be the winning bidder.
  if (!caller.publicKey.equals(auction.highestBidder)) {
    throw new Error(
      'Only the winning bidder can settle this auction (their wallet pays the ' +
      'winning bid). Winner: ' + auction.highestBidder.toBase58()
    )
  }

  if (!auction.escrowId) {
    throw new Error('Auction has no escrow')
  }

  // Check reserve price
  if (auction.reservePrice && auction.highestBid < auction.reservePrice) {
    throw new Error(
      `Highest bid (${auction.highestBid}) does not meet reserve price (${auction.reservePrice})`
    )
  }

  const escrow = getEscrow(auction.escrowId)
  if (!escrow) {
    throw new Error('Escrow not found')
  }

  const escrowKeypair = getEscrowKeypair(auction.escrowId)
  if (!escrowKeypair) {
    throw new Error('Escrow keypair not found')
  }

  const royaltyInfo = await getRoyaltyInfo(auction.mint, config)

  const instructions = []

  // Winner ATA
  const winnerATA = await getAssociatedTokenAddress(
    auction.mint,
    auction.highestBidder,
    false,
    TOKEN_PROGRAM_ID
  )

  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      caller.publicKey,
      winnerATA,
      auction.highestBidder,
      auction.mint,
      TOKEN_PROGRAM_ID
    )
  )

  // Royalties (paid by the winning bidder, who is the caller — see guard above)
  const { instructions: royaltyIxs, totalRoyalty } = buildRoyaltyInstructions(
    caller.publicKey,
    auction.highestBid,
    royaltyInfo
  )
  // Defensive: royalties must never exceed the sale price. calculateRoyalties
  // validates and caps, but never build settlement instructions that would pay
  // creators more than the buyer spends.
  if (totalRoyalty > auction.highestBid) {
    throw new Error(
      `Computed royalty (${totalRoyalty}) exceeds sale price (${auction.highestBid}) — aborting settlement`
    )
  }
  instructions.push(...royaltyIxs)

  // SOL to seller
  const sellerAmount = auction.highestBid - totalRoyalty
  if (sellerAmount > 0n) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: caller.publicKey,
        toPubkey: auction.seller,
        lamports: sellerAmount,
      })
    )
  }

  // NFT from escrow to winner
  instructions.push(
    createTransferCheckedInstruction(
      escrow.escrowTokenAccount,
      auction.mint,
      winnerATA,
      escrowKeypair.publicKey,
      1n,
      0,
      [],
      TOKEN_PROGRAM_ID
    )
  )

  // Close escrow ATA
  instructions.push(
    createCloseAccountInstruction(
      escrow.escrowTokenAccount,
      auction.seller,
      escrowKeypair.publicKey,
      [],
      TOKEN_PROGRAM_ID
    )
  )

  const transaction = await buildTransaction(
    connection,
    instructions,
    caller.publicKey
  )
  transaction.partialSign(caller)
  transaction.partialSign(escrowKeypair)

  const result = await sendAndConfirmTransaction(connection, transaction)
  if (!result.confirmed) {
    throw new Error(
      `Failed to settle auction: ${result.error ?? 'transaction not confirmed'}`
    )
  }

  updateAuctionSettle(auctionId, result.signature)

  return {
    signature: result.signature,
    auction: { ...auction, status: 'settled', settleSignature: result.signature },
  }
}

/**
 * Cancel an auction — return NFT from escrow to seller
 *
 * English auctions with bids cannot be cancelled during the settlement grace
 * period (`endTime + settleGracePeriod`, default 24h — see
 * DEFAULT_SETTLE_GRACE_PERIOD_MS): the winner has exclusive rights to settle
 * in that window. After the grace period expires without settlement, the
 * SELLER may cancel despite the bids, so a non-settling (griefer) top bidder
 * cannot lock the NFT forever. Dutch auctions and bid-less English auctions
 * can be cancelled at any time.
 *
 * The status only flips to 'cancelled' after the NFT-return transaction
 * confirms.
 */
export async function cancelAuction(
  auctionId: string,
  config: TokenConfig,
  storePath?: string,
): Promise<void> {
  const connection = createConnection(config)
  const seller = loadWallet(config)

  const auction = getAuction(auctionId, storePath)
  if (!auction) {
    throw new Error(`Auction not found: ${auctionId}`)
  }

  if (auction.status === 'settled') {
    throw new Error('Cannot cancel a settled auction')
  }

  if (auction.seller.toBase58() !== seller.publicKey.toBase58()) {
    throw new Error('Only the seller can cancel this auction')
  }

  if (auction.bids.length > 0 && auction.type === 'english') {
    // Only the winner can settle, so a non-settling top bidder could otherwise
    // lock the seller's NFT forever. After endTime + the settlement grace
    // period the seller may reclaim the NFT despite the bids.
    const gracePeriod = auction.settleGracePeriod ?? DEFAULT_SETTLE_GRACE_PERIOD_MS
    const graceEndsAt = auction.endTime + gracePeriod
    if (Date.now() <= graceEndsAt) {
      throw new Error(
        'Cannot cancel an English auction with active bids until the settlement ' +
        `grace period has passed (grace ends ${new Date(graceEndsAt).toISOString()})`
      )
    }
  }

  if (!auction.escrowId) {
    throw new Error('Auction has no escrow')
  }

  const escrow = getEscrow(auction.escrowId, storePath)
  if (!escrow) {
    throw new Error('Escrow not found')
  }

  const escrowKeypair = getEscrowKeypair(auction.escrowId, storePath)
  if (!escrowKeypair) {
    throw new Error('Escrow keypair not found')
  }

  const sellerATA = await getAssociatedTokenAddress(
    auction.mint,
    seller.publicKey,
    false,
    TOKEN_PROGRAM_ID
  )

  const instructions = [
    // NFT back to seller
    createTransferCheckedInstruction(
      escrow.escrowTokenAccount,
      auction.mint,
      sellerATA,
      escrowKeypair.publicKey,
      1n,
      0,
      [],
      TOKEN_PROGRAM_ID
    ),
    // Close escrow ATA
    createCloseAccountInstruction(
      escrow.escrowTokenAccount,
      seller.publicKey,
      escrowKeypair.publicKey,
      [],
      TOKEN_PROGRAM_ID
    ),
  ]

  const transaction = await buildTransaction(
    connection,
    instructions,
    seller.publicKey
  )
  transaction.partialSign(seller)
  transaction.partialSign(escrowKeypair)

  const result = await sendAndConfirmTransaction(connection, transaction)
  if (!result.confirmed) {
    throw new Error(
      `Failed to cancel auction: ${result.error ?? 'transaction not confirmed'}`
    )
  }

  updateAuctionStatus(auctionId, 'cancelled', storePath)
}

/**
 * Get auction info by ID
 */
export function getAuctionInfo(auctionId: string): AuctionRecord | null {
  return getAuction(auctionId)
}

/**
 * Get all active auctions
 */
export function getActiveAuctions(): AuctionRecord[] {
  return storeGetActiveAuctions()
}

/**
 * Get all ended (unsettled) auctions
 */
export function getEndedAuctions(): AuctionRecord[] {
  return storeGetEndedAuctions()
}
