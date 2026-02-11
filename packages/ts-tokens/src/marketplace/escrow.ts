/**
 * Escrow-Based Sales
 *
 * Seller deposits NFT into an escrow account. Buyer settles by paying SOL
 * (including royalties). The escrow keypair is stored in state for settlement
 * without seller interaction.
 */

import {
  Keypair,
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
import type { CreateEscrowOptions, EscrowRecord } from './types'
import {
  generateId,
  saveEscrow,
  getEscrow,
  getEscrowKeypair,
  updateEscrowStatus,
  updateEscrowBuyer,
  addEscrowSignature,
} from './store'
import { getRoyaltyInfo, buildRoyaltyInstructions } from './royalties'

/**
 * Create an escrow sale — seller deposits NFT
 *
 * 1. Generate escrow keypair, store in state
 * 2. Create escrow ATA + transfer NFT from seller -> escrow ATA
 * 3. Sign with seller + escrowKeypair
 */
export async function createEscrow(
  options: CreateEscrowOptions,
  config: TokenConfig
): Promise<EscrowRecord> {
  const connection = createConnection(config)
  const seller = loadWallet(config)

  const escrowKeypair = Keypair.generate()

  const sellerATA = await getAssociatedTokenAddress(
    options.mint,
    seller.publicKey,
    false,
    TOKEN_PROGRAM_ID
  )

  const escrowATA = await getAssociatedTokenAddress(
    options.mint,
    escrowKeypair.publicKey,
    true, // allowOwnerOffCurve for escrow
    TOKEN_PROGRAM_ID
  )

  const instructions = [
    // Create escrow ATA
    createAssociatedTokenAccountInstruction(
      seller.publicKey,
      escrowATA,
      escrowKeypair.publicKey,
      options.mint,
      TOKEN_PROGRAM_ID
    ),
    // Transfer NFT from seller to escrow
    createTransferCheckedInstruction(
      sellerATA,
      options.mint,
      escrowATA,
      seller.publicKey,
      1n, // NFT
      0,  // decimals
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

  const escrow: EscrowRecord = {
    id: generateId('escrow'),
    mint: options.mint,
    seller: seller.publicKey,
    price: options.price,
    currency: options.currency ?? 'SOL',
    escrowAccount: escrowKeypair.publicKey,
    escrowTokenAccount: escrowATA,
    status: 'funded',
    signatures: [result.signature],
    expiry: options.expiry,
    createdAt: Date.now(),
  }

  const escrowSecret = Buffer.from(escrowKeypair.secretKey).toString('base64')
  saveEscrow(escrow, escrowSecret)

  return escrow
}

/**
 * Settle an escrow — buyer pays and receives NFT
 *
 * Atomic transaction:
 * 1. Create buyer ATA if needed
 * 2. Royalty payments
 * 3. SOL transfer: buyer -> seller (price - royalties)
 * 4. NFT transfer: escrowATA -> buyerATA
 * 5. Close escrow ATA (rent to seller)
 *
 * Signed by buyer + escrowKeypair
 */
export async function settleEscrow(
  escrowId: string,
  config: TokenConfig
): Promise<{ signature: string; escrow: EscrowRecord }> {
  const connection = createConnection(config)
  const buyer = loadWallet(config)

  const escrow = getEscrow(escrowId)
  if (!escrow) {
    throw new Error(`Escrow not found: ${escrowId}`)
  }

  if (escrow.status !== 'funded') {
    throw new Error(`Escrow is not in funded state (status: ${escrow.status})`)
  }

  if (escrow.expiry && escrow.expiry < Date.now()) {
    updateEscrowStatus(escrowId, 'expired')
    throw new Error('Escrow has expired')
  }

  const escrowKeypair = getEscrowKeypair(escrowId)
  if (!escrowKeypair) {
    throw new Error('Escrow keypair not found in state')
  }

  const royaltyInfo = await getRoyaltyInfo(escrow.mint, config)

  const instructions = []

  // Create buyer ATA
  const buyerATA = await getAssociatedTokenAddress(
    escrow.mint,
    buyer.publicKey,
    false,
    TOKEN_PROGRAM_ID
  )

  instructions.push(
    createAssociatedTokenAccountInstruction(
      buyer.publicKey,
      buyerATA,
      buyer.publicKey,
      escrow.mint,
      TOKEN_PROGRAM_ID
    )
  )

  // Royalty payments
  const { instructions: royaltyIxs, totalRoyalty } = buildRoyaltyInstructions(
    buyer.publicKey,
    escrow.price,
    royaltyInfo
  )
  instructions.push(...royaltyIxs)

  // SOL to seller
  const sellerAmount = escrow.price - totalRoyalty
  if (sellerAmount > 0n) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: buyer.publicKey,
        toPubkey: escrow.seller,
        lamports: sellerAmount,
      })
    )
  }

  // NFT from escrow to buyer
  instructions.push(
    createTransferCheckedInstruction(
      escrow.escrowTokenAccount,
      escrow.mint,
      buyerATA,
      escrowKeypair.publicKey, // escrow authority
      1n,
      0,
      [],
      TOKEN_PROGRAM_ID
    )
  )

  // Close escrow ATA (rent refund to seller)
  instructions.push(
    createCloseAccountInstruction(
      escrow.escrowTokenAccount,
      escrow.seller, // rent destination
      escrowKeypair.publicKey, // authority
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

  updateEscrowStatus(escrowId, 'settled')
  updateEscrowBuyer(escrowId, buyer.publicKey.toBase58())
  addEscrowSignature(escrowId, result.signature)

  return { signature: result.signature, escrow: { ...escrow, status: 'settled', buyer: buyer.publicKey } }
}

/**
 * Cancel an escrow — seller reclaims NFT
 *
 * 1. NFT from escrow -> seller
 * 2. Close escrow ATA
 * Signed by seller + escrowKeypair
 */
export async function cancelEscrow(
  escrowId: string,
  config: TokenConfig
): Promise<void> {
  const connection = createConnection(config)
  const seller = loadWallet(config)

  const escrow = getEscrow(escrowId)
  if (!escrow) {
    throw new Error(`Escrow not found: ${escrowId}`)
  }

  if (escrow.status !== 'funded' && escrow.status !== 'pending') {
    throw new Error(`Cannot cancel escrow in state: ${escrow.status}`)
  }

  if (escrow.seller.toBase58() !== seller.publicKey.toBase58()) {
    throw new Error('Only the seller can cancel this escrow')
  }

  const escrowKeypair = getEscrowKeypair(escrowId)
  if (!escrowKeypair) {
    throw new Error('Escrow keypair not found in state')
  }

  const sellerATA = await getAssociatedTokenAddress(
    escrow.mint,
    seller.publicKey,
    false,
    TOKEN_PROGRAM_ID
  )

  const instructions = [
    // Transfer NFT back to seller
    createTransferCheckedInstruction(
      escrow.escrowTokenAccount,
      escrow.mint,
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

  updateEscrowStatus(escrowId, 'cancelled')
}

/**
 * Get escrow info by ID
 */
export function getEscrowInfo(escrowId: string): EscrowRecord | null {
  return getEscrow(escrowId)
}
