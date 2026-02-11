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
  createAssociatedTokenAccountInstruction,
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
 * Create an auction
 *
 * 1. Deposits NFT into escrow (reuses createEscrow)
 * 2. Creates auction record with type, times, pricing
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
    createAssociatedTokenAccountInstruction(
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
    createAssociatedTokenAccountInstruction(
      caller.publicKey,
      winnerATA,
      auction.highestBidder,
      auction.mint,
      TOKEN_PROGRAM_ID
    )
  )

  // Royalties (paid by caller / settlement executor)
  const { instructions: royaltyIxs, totalRoyalty } = buildRoyaltyInstructions(
    caller.publicKey,
    auction.highestBid,
    royaltyInfo
  )
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

  updateAuctionSettle(auctionId, result.signature)

  return {
    signature: result.signature,
    auction: { ...auction, status: 'settled', settleSignature: result.signature },
  }
}

/**
 * Cancel an auction — return NFT from escrow to seller
 */
export async function cancelAuction(
  auctionId: string,
  config: TokenConfig
): Promise<void> {
  const connection = createConnection(config)
  const seller = loadWallet(config)

  const auction = getAuction(auctionId)
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
    throw new Error('Cannot cancel an English auction with active bids')
  }

  if (!auction.escrowId) {
    throw new Error('Auction has no escrow')
  }

  const escrow = getEscrow(auction.escrowId)
  if (!escrow) {
    throw new Error('Escrow not found')
  }

  const escrowKeypair = getEscrowKeypair(auction.escrowId)
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

  await sendAndConfirmTransaction(connection, transaction)

  updateAuctionStatus(auctionId, 'cancelled')
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
