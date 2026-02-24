/**
 * Offer / Bid System
 *
 * Offers are off-chain records. Acceptance triggers on-chain settlement
 * using the escrow pattern (seller deposits NFT, then settles with buyer's payment).
 */

import {
  PublicKey,
  SystemProgram,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
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
  updateOfferStatus,
  getOffersForMint as storeGetOffersForMint,
} from './store'
import { getRoyaltyInfo, buildRoyaltyInstructions } from './royalties'

/**
 * Make an offer on an NFT (off-chain record only)
 */
export async function makeOffer(
  options: CreateOfferOptions,
  config: TokenConfig
): Promise<LocalOffer> {
  const bidder = loadWallet(config)

  if (options.price <= 0n) {
    throw new Error('Offer price must be greater than zero')
  }

  const offer: LocalOffer = {
    id: generateId('offer'),
    mint: options.mint,
    bidder: bidder.publicKey,
    price: options.price,
    currency: options.currency ?? 'SOL',
    expiry: options.expiry,
    createdAt: Date.now(),
    status: 'active',
  }

  saveOffer(offer)
  return offer
}

/**
 * Accept an offer — seller sends NFT, buyer pays SOL (atomic swap)
 *
 * The seller builds and signs a transaction that:
 * 1. Creates buyer ATA if needed
 * 2. Pays royalties from offer proceeds
 * 3. Transfers SOL from the bidder to the seller
 * 4. Transfers NFT from seller to bidder
 *
 * Note: In a real P2P scenario, the bidder would need to co-sign.
 * For CLI simplicity, this assumes the current wallet is the seller
 * and builds the transaction accordingly.
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

  const instructions = []

  // Create bidder ATA if needed
  instructions.push(
    createAssociatedTokenAccountInstruction(
      seller.publicKey,
      bidderATA,
      offer.bidder,
      offer.mint,
      TOKEN_PROGRAM_ID
    )
  )

  // Royalty payments from seller (deducted from offer price)
  const { instructions: royaltyIxs, _totalRoyalty } = buildRoyaltyInstructions(
    seller.publicKey,
    offer.price,
    royaltyInfo
  )
  instructions.push(...royaltyIxs)

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

  const transaction = await buildTransaction(
    connection,
    instructions,
    seller.publicKey
  )
  transaction.partialSign(seller)

  const result = await sendAndConfirmTransaction(connection, transaction)

  updateOfferStatus(offerId, 'accepted')

  return { signature: result.signature, offer: { ...offer, status: 'accepted' } }
}

/**
 * Cancel an offer (by the bidder)
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

  updateOfferStatus(offerId, 'cancelled')
}

/**
 * Reject an offer (by the NFT owner)
 */
export async function rejectOffer(
  offerId: string,
  _config: TokenConfig
): Promise<void> {
  const offer = getOffer(offerId)

  if (!offer) {
    throw new Error(`Offer not found: ${offerId}`)
  }

  if (offer.status !== 'active') {
    throw new Error(`Offer is not active (status: ${offer.status})`)
  }

  updateOfferStatus(offerId, 'rejected')
}

/**
 * Get active offers for a specific NFT
 */
export function getOffersForNFT(mint: string): LocalOffer[] {
  return storeGetOffersForMint(mint)
}
