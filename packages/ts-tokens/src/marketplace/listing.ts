/**
 * Direct P2P Listing
 *
 * Uses the delegate pattern: seller approves a delegate keypair on their NFT
 * token account at list time. Buyer executes the swap using the delegate
 * keypair (stored in state file). No seller co-sign needed at buy time.
 */

import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createApproveInstruction,
  createRevokeInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { createTransferCheckedInstruction } from '@solana/spl-token'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import type { CreateListingOptions, LocalListing } from './types'
import {
  generateId,
  saveListing,
  getListingByMint,
  getListing,
  getListingDelegateKeypair,
  updateListingStatus,
  getActiveListings as storeGetActiveListings,
} from './store'
import { getRoyaltyInfo, buildRoyaltyInstructions } from './royalties'

/**
 * List an NFT for direct sale using the delegate pattern
 *
 * 1. Generates a delegate keypair, stored in state
 * 2. Builds tx: createApproveInstruction(sellerATA, delegate, seller, 1)
 * 3. Saves listing record with status 'active'
 */
export async function listNFT(
  options: CreateListingOptions,
  config: TokenConfig
): Promise<LocalListing> {
  const connection = createConnection(config)
  const seller = loadWallet(config)

  const sellerATA = await getAssociatedTokenAddress(
    options.mint,
    seller.publicKey,
    false,
    TOKEN_PROGRAM_ID
  )

  // Generate delegate keypair
  const delegateKeypair = Keypair.generate()

  // Build approve instruction
  const instructions = [
    createApproveInstruction(
      sellerATA,
      delegateKeypair.publicKey,
      seller.publicKey,
      1n, // NFT: approve 1 token
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

  const result = await sendAndConfirmTransaction(connection, transaction)

  // Create listing record
  const listing: LocalListing = {
    id: generateId('listing'),
    mint: options.mint,
    seller: seller.publicKey,
    price: options.price,
    currency: options.currency ?? 'SOL',
    paymentMint: options.paymentMint,
    sellerTokenAccount: sellerATA,
    delegated: true,
    expiry: options.expiry,
    createdAt: Date.now(),
    status: 'active',
  }

  // Store with delegate secret
  const delegateSecret = Buffer.from(delegateKeypair.secretKey).toString('base64')
  saveListing(listing, delegateSecret)

  return listing
}

/**
 * Delist an NFT — revoke the delegate approval
 *
 * 1. Loads listing from state
 * 2. Builds tx: createRevokeInstruction(sellerATA, seller)
 * 3. Updates listing status to 'cancelled'
 */
export async function delistNFT(
  mintAddress: PublicKey,
  config: TokenConfig
): Promise<void> {
  const connection = createConnection(config)
  const seller = loadWallet(config)

  const listing = getListingByMint(mintAddress.toBase58())
  if (!listing) {
    throw new Error(`No active listing found for mint ${mintAddress.toBase58()}`)
  }

  if (listing.seller.toBase58() !== seller.publicKey.toBase58()) {
    throw new Error('Only the seller can delist this NFT')
  }

  const instructions = [
    createRevokeInstruction(
      listing.sellerTokenAccount,
      seller.publicKey,
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

  await sendAndConfirmTransaction(connection, transaction)

  updateListingStatus(listing.id, 'cancelled')
}

/**
 * Buy a listed NFT
 *
 * Atomic transaction:
 * 1. Create buyer ATA if needed
 * 2. Royalty payments (SystemProgram.transfer per creator)
 * 3. SOL transfer: buyer -> seller (price - totalRoyalty)
 * 4. NFT transfer: sellerATA -> buyerATA via delegate
 *
 * Signed by buyer + delegateKeypair
 */
export async function buyListedNFT(
  mintAddress: PublicKey,
  config: TokenConfig
): Promise<{ signature: string; listing: LocalListing }> {
  const connection = createConnection(config)
  const buyer = loadWallet(config)

  const listing = getListingByMint(mintAddress.toBase58())
  if (!listing) {
    throw new Error(`No active listing found for mint ${mintAddress.toBase58()}`)
  }

  if (listing.status !== 'active') {
    throw new Error(`Listing is not active (status: ${listing.status})`)
  }

  // Check expiry
  if (listing.expiry && listing.expiry < Date.now()) {
    updateListingStatus(listing.id, 'cancelled')
    throw new Error('Listing has expired')
  }

  const delegateKeypair = getListingDelegateKeypair(listing.id)
  if (!delegateKeypair) {
    throw new Error('Delegate keypair not found in state — listing may be corrupted')
  }

  // Fetch royalty info
  const royaltyInfo = await getRoyaltyInfo(listing.mint, config)

  const instructions = []

  // Create buyer ATA if needed
  const buyerATA = await getAssociatedTokenAddress(
    listing.mint,
    buyer.publicKey,
    false,
    TOKEN_PROGRAM_ID
  )

  instructions.push(
    createAssociatedTokenAccountInstruction(
      buyer.publicKey,
      buyerATA,
      buyer.publicKey,
      listing.mint,
      TOKEN_PROGRAM_ID
    )
  )

  // Build royalty instructions
  const { instructions: royaltyIxs, totalRoyalty } = buildRoyaltyInstructions(
    buyer.publicKey,
    listing.price,
    royaltyInfo
  )
  instructions.push(...royaltyIxs)

  // SOL transfer: buyer -> seller (price - royalty)
  const sellerAmount = listing.price - totalRoyalty
  if (sellerAmount > 0n) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: buyer.publicKey,
        toPubkey: listing.seller,
        lamports: sellerAmount,
      })
    )
  }

  // NFT transfer via delegate
  instructions.push(
    createTransferCheckedInstruction(
      listing.sellerTokenAccount,
      listing.mint,
      buyerATA,
      delegateKeypair.publicKey, // delegate authority
      1n, // NFT amount
      0,  // NFT decimals
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
  transaction.partialSign(delegateKeypair)

  const result = await sendAndConfirmTransaction(connection, transaction)

  updateListingStatus(listing.id, 'sold')

  return { signature: result.signature, listing }
}

/**
 * Get all active listings
 */
export function getActiveListings(): LocalListing[] {
  return storeGetActiveListings()
}

/**
 * Get the active listing for a specific mint
 */
export function getListingForMint(mint: string): LocalListing | null {
  return getListingByMint(mint)
}
