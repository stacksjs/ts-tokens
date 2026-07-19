/**
 * Royalty Calculation & Enforcement
 *
 * Pure royalty math, on-chain metadata fetching, and instruction building
 * for atomic royalty payments in P2P trades.
 */

import {
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import type {
  RoyaltyCalculationOptions,
  RoyaltyDistributionResult,
  RoyaltyPayment,
  RoyaltyInfo,
} from './types'

/**
 * Token Metadata Program ID (Metaplex)
 */
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Derive the metadata PDA for a given mint
 */
export function getMetadataAddress(mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )
  return address
}

/**
 * Calculate royalty distribution (pure function — no network calls)
 *
 * Secondary sale: totalRoyalty = salePrice * sellerFeeBasisPoints / 10000
 * Primary sale: 100% of proceeds distributed to creators by share
 * Each creator gets: totalRoyalty * share / 100
 *
 * Validates the inputs because sellerFeeBasisPoints and creator shares come
 * from NFT metadata that anyone can write: a malicious NFT advertising e.g.
 * 20000 bps would make a buyer pay 2x the sale price. Throws on
 * sellerFeeBasisPoints > 10000 (100%) or creator shares summing above 100,
 * and caps totalRoyalty at salePrice as a final invariant.
 */
export function calculateRoyalties(options: RoyaltyCalculationOptions): RoyaltyDistributionResult {
  const { salePrice, sellerFeeBasisPoints, creators, isPrimarySale = false } = options

  if (
    !Number.isFinite(sellerFeeBasisPoints) ||
    sellerFeeBasisPoints < 0 ||
    sellerFeeBasisPoints > 10000
  ) {
    throw new Error(
      `Invalid sellerFeeBasisPoints ${sellerFeeBasisPoints}: must be between 0 and ` +
      '10000 (100%). Refusing to compute royalties — malformed or malicious NFT ' +
      'metadata could otherwise overcharge the buyer.'
    )
  }

  const totalShare = creators.reduce((sum, creator) => sum + creator.share, 0)
  if (totalShare > 100) {
    throw new Error(
      `Creator shares sum to ${totalShare} (maximum 100). Refusing to compute ` +
      'royalties — malformed or malicious NFT metadata could otherwise overcharge ' +
      'the buyer.'
    )
  }

  if (salePrice <= 0n) {
    return {
      totalRoyalty: 0n,
      salePrice,
      sellerFeeBasisPoints,
      payments: [],
      isPrimarySale,
    }
  }

  let totalRoyalty: bigint

  if (isPrimarySale) {
    totalRoyalty = salePrice
  } else {
    totalRoyalty = (salePrice * BigInt(sellerFeeBasisPoints)) / 10000n
  }

  // Invariant: royalties can never exceed the sale price. With the validation
  // above this is unreachable, but keep the cap so a future code path can
  // never pay out more than the buyer spends.
  if (totalRoyalty > salePrice) {
    totalRoyalty = salePrice
  }

  const payments: RoyaltyPayment[] = creators.map(creator => {
    const amount = (totalRoyalty * BigInt(creator.share)) / 100n
    return {
      creator: creator.address,
      share: creator.share,
      amount,
    }
  })

  return {
    totalRoyalty,
    salePrice,
    sellerFeeBasisPoints,
    payments,
    isPrimarySale,
  }
}

/**
 * Fetch royalty info from on-chain metadata
 */
export async function getRoyaltyInfo(mint: PublicKey, config: TokenConfig): Promise<RoyaltyInfo> {
  const connection = createConnection(config)
  const metadataAddress = getMetadataAddress(mint)

  const accountInfo = await connection.getAccountInfo(metadataAddress)
  if (!accountInfo) {
    return {
      mint,
      sellerFeeBasisPoints: 0,
      creators: [],
      enforcedByMarketplace: false,
      primarySaleHappened: false,
    } as RoyaltyInfo & { primarySaleHappened: boolean }
  }

  const data = accountInfo.data

  // Parse Metaplex metadata account
  // Layout: key(1) + update_authority(32) + mint(32) + name(4+len) + symbol(4+len) + uri(4+len)
  //         + seller_fee_basis_points(2) + creators(option) + primary_sale_happened(1)
  let offset = 1 + 32 + 32 // skip key, update_authority, mint

  // Skip name
  const nameLen = data.readUInt32LE(offset)
  offset += 4 + nameLen

  // Skip symbol
  const symbolLen = data.readUInt32LE(offset)
  offset += 4 + symbolLen

  // Skip uri
  const uriLen = data.readUInt32LE(offset)
  offset += 4 + uriLen

  // Read seller_fee_basis_points
  const sellerFeeBasisPoints = data.readUInt16LE(offset)
  offset += 2

  // Read creators option
  const hasCreators = data.readUInt8(offset) === 1
  offset += 1

  const creators: Array<{ address: PublicKey; share: number; verified: boolean }> = []

  if (hasCreators) {
    const creatorCount = data.readUInt32LE(offset)
    offset += 4

    for (let i = 0; i < creatorCount; i++) {
      const address = new PublicKey(data.subarray(offset, offset + 32))
      offset += 32
      const verified = data.readUInt8(offset) === 1
      offset += 1
      const share = data.readUInt8(offset)
      offset += 1
      creators.push({ address, share, verified })
    }
  }

  // Read primary_sale_happened
  const primarySaleHappened = data.readUInt8(offset) === 1

  return {
    mint,
    sellerFeeBasisPoints,
    creators,
    enforcedByMarketplace: false,
    primarySaleHappened,
  } as RoyaltyInfo & { primarySaleHappened: boolean }
}

/**
 * Build SOL royalty payment instructions (SystemProgram.transfer per creator)
 */
export function buildRoyaltyInstructions(
  buyer: PublicKey,
  salePrice: bigint,
  royaltyInfo: RoyaltyInfo
): { instructions: TransactionInstruction[]; totalRoyalty: bigint } {
  const result = calculateRoyalties({
    salePrice,
    sellerFeeBasisPoints: royaltyInfo.sellerFeeBasisPoints,
    creators: royaltyInfo.creators.map(c => ({ address: c.address, share: c.share })),
    isPrimarySale: false,
  })

  const instructions: TransactionInstruction[] = []

  for (const payment of result.payments) {
    if (payment.amount > 0n) {
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: buyer,
          toPubkey: payment.creator,
          lamports: payment.amount,
        })
      )
    }
  }

  return { instructions, totalRoyalty: result.totalRoyalty }
}

/**
 * Build SPL token royalty payment instructions
 */
export async function buildSPLRoyaltyInstructions(
  buyer: PublicKey,
  buyerTokenAccount: PublicKey,
  salePrice: bigint,
  paymentMint: PublicKey,
  royaltyInfo: RoyaltyInfo,
  payer: PublicKey
): Promise<{ instructions: TransactionInstruction[]; totalRoyalty: bigint }> {
  const result = calculateRoyalties({
    salePrice,
    sellerFeeBasisPoints: royaltyInfo.sellerFeeBasisPoints,
    creators: royaltyInfo.creators.map(c => ({ address: c.address, share: c.share })),
    isPrimarySale: false,
  })

  const instructions: TransactionInstruction[] = []

  for (const payment of result.payments) {
    if (payment.amount > 0n) {
      const creatorATA = await getAssociatedTokenAddress(
        paymentMint,
        payment.creator,
        false,
        TOKEN_PROGRAM_ID
      )

      // Create creator ATA if needed (idempotent: a true no-op if it already exists)
      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
          payer,
          creatorATA,
          payment.creator,
          paymentMint,
          TOKEN_PROGRAM_ID
        )
      )

      instructions.push(
        createTransferInstruction(
          buyerTokenAccount,
          creatorATA,
          buyer,
          payment.amount,
          [],
          TOKEN_PROGRAM_ID
        )
      )
    }
  }

  return { instructions, totalRoyalty: result.totalRoyalty }
}

/**
 * Detect potential royalty bypass in a transaction.
 *
 * Analyzes a confirmed transaction to check if an NFT transfer occurred
 * without corresponding royalty payments to creators.
 */
// eslint-disable-next-line no-unused-vars
export async function detectRoyaltyBypass(
  signature: string,
  config: TokenConfig
): Promise<{
  bypassed: boolean
  nftTransferred: boolean
  royaltiesPaid: bigint
  expectedRoyalty: bigint
  details: string
}> {
  const connection = createConnection(config)

  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  })

  if (!tx || !tx.meta) {
    return {
      bypassed: false,
      nftTransferred: false,
      royaltiesPaid: 0n,
      expectedRoyalty: 0n,
      details: 'Transaction not found or not yet confirmed',
    }
  }

  // Check for token balance changes indicating NFT transfer (amount = 1)
  const preBalances = tx.meta.preTokenBalances || []
  const postBalances = tx.meta.postTokenBalances || []

  let nftTransferred = false
  let nftMint: string | undefined

  for (const post of postBalances) {
    const pre = preBalances.find(
      p => p.accountIndex === post.accountIndex && p.mint === post.mint
    )
    const preAmount = BigInt(pre?.uiTokenAmount?.amount ?? '0')
    const postAmount = BigInt(post.uiTokenAmount?.amount ?? '0')

    if (post.uiTokenAmount?.decimals === 0 && postAmount - preAmount === 1n) {
      nftTransferred = true
      nftMint = post.mint
      break
    }
  }

  if (!nftTransferred || !nftMint) {
    return {
      bypassed: false,
      nftTransferred: false,
      royaltiesPaid: 0n,
      expectedRoyalty: 0n,
      details: 'No NFT transfer detected in transaction',
    }
  }

  // Fetch royalty info for the transferred NFT
  const mint = new PublicKey(nftMint)
  const royaltyInfo = await getRoyaltyInfo(mint, config)

  if (royaltyInfo.sellerFeeBasisPoints === 0 || royaltyInfo.creators.length === 0) {
    return {
      bypassed: false,
      nftTransferred: true,
      royaltiesPaid: 0n,
      expectedRoyalty: 0n,
      details: 'NFT has no royalties configured',
    }
  }

  // Estimate sale price from SOL balance changes
  const preSolBalances = tx.meta.preBalances
  const postSolBalances = tx.meta.postBalances
  let maxSolReceived = 0n

  for (let i = 0; i < preSolBalances.length; i++) {
    const diff = BigInt(postSolBalances[i]) - BigInt(preSolBalances[i])
    if (diff > maxSolReceived) {
      maxSolReceived = diff
    }
  }

  const expectedRoyalty = (maxSolReceived * BigInt(royaltyInfo.sellerFeeBasisPoints)) / 10000n

  // Check if creator addresses received SOL
  const creatorAddresses = new Set(royaltyInfo.creators.map(c => c.address.toBase58()))
  const accountKeys = tx.transaction.message.getAccountKeys()
  let royaltiesPaid = 0n

  for (let i = 0; i < accountKeys.length; i++) {
    const key = accountKeys.get(i)
    if (key && creatorAddresses.has(key.toBase58())) {
      const diff = BigInt(postSolBalances[i]) - BigInt(preSolBalances[i])
      if (diff > 0n) {
        royaltiesPaid += diff
      }
    }
  }

  const bypassed = nftTransferred && expectedRoyalty > 0n && royaltiesPaid < expectedRoyalty

  return {
    bypassed,
    nftTransferred,
    royaltiesPaid,
    expectedRoyalty,
    details: bypassed
      ? `Royalty bypass detected: paid ${royaltiesPaid} of expected ${expectedRoyalty} lamports`
      : 'Royalties appear to be properly paid',
  }
}

/**
 * Build instruction to mark an NFT's primary sale as happened.
 *
 * Uses the UpdateMetadataAccountV2 instruction to set primarySaleHappened = true.
 */
export async function markPrimarySale(
  mint: PublicKey,
  updateAuthority: PublicKey,
  _config: TokenConfig
): Promise<TransactionInstruction> {
  const metadataAddress = getMetadataAddress(mint)

  // UpdateMetadataAccountV2 (discriminator 15). Args (borsh):
  //   data:                  Option<DataV2>  -> None
  //   update_authority:      Option<Pubkey>  -> None
  //   primary_sale_happened: Option<bool>    -> Some(true)
  //   is_mutable:            Option<bool>    -> None
  // An Option<bool> that is Some encodes TWO bytes (1 for Some, then the bool),
  // and the trailing is_mutable option byte must be present or deserialization
  // fails on-chain.
  const data = Buffer.from([
    15, // discriminator
    0,  // data: None
    0,  // update_authority: None
    1,  // primary_sale_happened: Some
    1,  // primary_sale_happened value: true
    0,  // is_mutable: None
  ])

  return {
    keys: [
      { pubkey: metadataAddress, isSigner: false, isWritable: true },
      { pubkey: updateAuthority, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  }
}
