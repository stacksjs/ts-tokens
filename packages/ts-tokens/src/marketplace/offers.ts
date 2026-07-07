/**
 * Offer / Bid System
 *
 * An offer escrows the bidder's SOL into a dedicated system account when it is
 * made. Acceptance (run by the seller) releases the escrowed SOL to the seller
 * and creators and hands the NFT to the bidder in a single atomic transaction,
 * signed by the seller and the offer's escrow keypair. Cancelling, rejecting, or
 * letting an offer expire refunds the escrowed SOL to the bidder.
 *
 * The escrow keypair is stored in the local marketplace state file (see ./store),
 * so this is a single-machine / trusted-operator model, not trustless P2P.
 */

import {
  Keypair,
  SystemProgram,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import type { CreateOfferOptions, LocalOffer } from './types'
import {
  generateId,
  saveOffer,
  getOffer,
  getOfferEscrowKeypair,
  updateOfferStatus,
  getOffersForMint as storeGetOffersForMint,
} from './store'
import { getRoyaltyInfo, buildRoyaltyInstructions } from './royalties'

/**
 * Make an offer on an NFT.
 *
 * Escrows `price` (plus the escrow account's rent-exempt minimum) from the
 * bidder into a fresh system account so the offer is actually funded. The escrow
 * keypair is persisted with the offer for later release/refund.
 */
export async function makeOffer(
  options: CreateOfferOptions,
  config: TokenConfig
): Promise<LocalOffer> {
  const connection = createConnection(config)
  const bidder = loadWallet(config)

  if (options.price <= 0n) {
    throw new Error('Offer price must be greater than zero')
  }

  const currency = options.currency ?? 'SOL'
  if (currency !== 'SOL') {
    // Settlement releases SOL via SystemProgram.transfer. An SPL offer would be
    // released as SOL lamports at the same numeric value, mispricing the trade.
    throw new Error('Only SOL-denominated offers are supported')
  }

  const escrowKeypair = Keypair.generate()

  // Fund the escrow with the offer price plus the rent-exempt minimum for a
  // 0-byte system account, so it persists until acceptance and can be fully
  // drained (price distributed, rent refunded to the bidder) at settlement.
  const rentExempt = BigInt(await connection.getMinimumBalanceForRentExemption(0))
  const funding = options.price + rentExempt

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: bidder.publicKey,
      toPubkey: escrowKeypair.publicKey,
      lamports: funding,
    }),
  ]

  const transaction = await buildTransaction(connection, instructions, bidder.publicKey)
  transaction.partialSign(bidder)

  const result = await sendAndConfirmTransaction(connection, transaction)
  if (!result.confirmed) {
    throw new Error(`Failed to fund offer escrow: ${result.error ?? 'transaction not confirmed'}`)
  }

  const offer: LocalOffer = {
    id: generateId('offer'),
    mint: options.mint,
    bidder: bidder.publicKey,
    price: options.price,
    currency,
    escrowAccount: escrowKeypair.publicKey,
    expiry: options.expiry,
    createdAt: Date.now(),
    status: 'active',
  }

  const escrowSecret = Buffer.from(escrowKeypair.secretKey).toString('base64')
  saveOffer(offer, escrowSecret)
  return offer
}

/**
 * Accept an offer — seller receives the escrowed SOL, bidder receives the NFT.
 *
 * Run by the seller. Atomic transaction:
 * 1. Create bidder ATA if needed (payer: seller)
 * 2. Royalty payments from escrow -> creators
 * 3. SOL from escrow -> seller (price - royalties)
 * 4. NFT from seller -> bidder
 * 5. Refund the leftover escrow rent from escrow -> bidder (drains escrow to 0)
 *
 * Signed by the seller and the offer's escrow keypair.
 */
export async function acceptOffer(
  offerId: string,
  config: TokenConfig
): Promise<{ signature: string; offer: LocalOffer }> {
  const connection = createConnection(config)
  const seller = loadWallet(config)

  const offer = getOffer(offerId)
  if (!offer) {
    throw new Error(`Offer not found: ${offerId}`)
  }

  if (offer.status !== 'active') {
    throw new Error(`Offer is not active (status: ${offer.status})`)
  }

  if (offer.expiry && offer.expiry < Date.now()) {
    updateOfferStatus(offerId, 'expired')
    throw new Error('Offer has expired')
  }

  if (!offer.escrowAccount) {
    throw new Error('Offer has no escrow account — it may predate escrow-backed offers')
  }

  const escrowKeypair = getOfferEscrowKeypair(offerId)
  if (!escrowKeypair) {
    throw new Error('Offer escrow keypair not found in state')
  }

  const sellerATA = await getAssociatedTokenAddress(
    offer.mint,
    seller.publicKey,
    false,
    TOKEN_PROGRAM_ID
  )

  const bidderATA = await getAssociatedTokenAddress(
    offer.mint,
    offer.bidder,
    false,
    TOKEN_PROGRAM_ID
  )

  const royaltyInfo = await getRoyaltyInfo(offer.mint, config)

  // The escrow holds `price + rent`. Distribute the price to creators + seller
  // and refund the remainder (the rent) to the bidder so the escrow drains to 0.
  const escrowBalance = BigInt(await connection.getBalance(escrowKeypair.publicKey))

  const instructions = []

  // Create bidder ATA if needed (seller pays the rent for it)
  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      seller.publicKey,
      bidderATA,
      offer.bidder,
      offer.mint,
      TOKEN_PROGRAM_ID
    )
  )

  // Royalty payments funded from the escrow account
  const { instructions: royaltyIxs, totalRoyalty } = buildRoyaltyInstructions(
    escrowKeypair.publicKey,
    offer.price,
    royaltyInfo
  )
  instructions.push(...royaltyIxs)

  // SOL from escrow to seller (price - royalties)
  const sellerAmount = offer.price - totalRoyalty
  if (sellerAmount > 0n) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: escrowKeypair.publicKey,
        toPubkey: seller.publicKey,
        lamports: sellerAmount,
      })
    )
  }

  // Transfer NFT from seller to bidder
  instructions.push(
    createTransferCheckedInstruction(
      sellerATA,
      offer.mint,
      bidderATA,
      seller.publicKey,
      1n,
      0,
      [],
      TOKEN_PROGRAM_ID
    )
  )

  // Refund the leftover escrow balance (the rent) to the bidder, draining it to 0
  const refund = escrowBalance - offer.price
  if (refund > 0n) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: escrowKeypair.publicKey,
        toPubkey: offer.bidder,
        lamports: refund,
      })
    )
  }

  const transaction = await buildTransaction(
    connection,
    instructions,
    seller.publicKey
  )
  transaction.partialSign(seller)
  transaction.partialSign(escrowKeypair)

  const result = await sendAndConfirmTransaction(connection, transaction)
  if (!result.confirmed) {
    throw new Error(`Failed to accept offer: ${result.error ?? 'transaction not confirmed'}`)
  }

  updateOfferStatus(offerId, 'accepted')

  return { signature: result.signature, offer: { ...offer, status: 'accepted' } }
}

/**
 * Refund an offer's escrowed SOL back to the bidder, draining the escrow to 0.
 */
async function refundOfferEscrow(offerId: string, config: TokenConfig): Promise<void> {
  const offer = getOffer(offerId)
  if (!offer?.escrowAccount) return

  const escrowKeypair = getOfferEscrowKeypair(offerId)
  if (!escrowKeypair) return

  const connection = createConnection(config)
  const balance = BigInt(await connection.getBalance(escrowKeypair.publicKey))
  if (balance <= 0n) return

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: escrowKeypair.publicKey,
      toPubkey: offer.bidder,
      lamports: balance,
    }),
  ]

  const transaction = await buildTransaction(connection, instructions, escrowKeypair.publicKey)
  transaction.partialSign(escrowKeypair)

  await sendAndConfirmTransaction(connection, transaction)
}

/**
 * Cancel an offer (by the bidder) and refund the escrowed SOL
 */
export async function cancelOffer(
  offerId: string,
  config: TokenConfig
): Promise<void> {
  const bidder = loadWallet(config)
  const offer = getOffer(offerId)

  if (!offer) {
    throw new Error(`Offer not found: ${offerId}`)
  }

  if (offer.status !== 'active') {
    throw new Error(`Offer is not active (status: ${offer.status})`)
  }

  if (offer.bidder.toBase58() !== bidder.publicKey.toBase58()) {
    throw new Error('Only the bidder can cancel this offer')
  }

  await refundOfferEscrow(offerId, config)
  updateOfferStatus(offerId, 'cancelled')
}

/**
 * Reject an offer (by the NFT owner) and refund the escrowed SOL to the bidder
 */
export async function rejectOffer(
  offerId: string,
  config: TokenConfig
): Promise<void> {
  const offer = getOffer(offerId)

  if (!offer) {
    throw new Error(`Offer not found: ${offerId}`)
  }

  if (offer.status !== 'active') {
    throw new Error(`Offer is not active (status: ${offer.status})`)
  }

  await refundOfferEscrow(offerId, config)
  updateOfferStatus(offerId, 'rejected')
}

/**
 * Get active offers for a specific NFT
 */
export function getOffersForNFT(mint: string): LocalOffer[] {
  return storeGetOffersForMint(mint)
}
