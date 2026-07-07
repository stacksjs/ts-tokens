/**
 * Marketplace Royalty Verification
 *
 * Verify that royalties are being properly enforced across marketplaces.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import { getRoyaltyInfo } from './royalties'

export interface RoyaltyVerificationResult {
  mint: PublicKey
  expectedRoyaltyBps: number
  marketplace: string
  enforced: boolean
  actualRoyaltyPaid: bigint
  expectedRoyaltyAmount: bigint
  salePrice: bigint
  seller: string
  buyer: string
  timestamp: number
  transactionSignature: string
}

export interface RoyaltyComplianceReport {
  totalSales: number
  compliantSales: number
  nonCompliantSales: number
  complianceRate: number
  totalRoyaltiesExpected: bigint
  totalRoyaltiesPaid: bigint
  byMarketplace: Record<string, { sales: number; compliant: number; rate: number }>
  violations: RoyaltyVerificationResult[]
}

/**
 * Verify royalty payment for a specific transaction.
 *
 * Parses a confirmed sale transaction's pre/post balances the same way as
 * `detectRoyaltyBypass` in ./royalties:
 *   1. Find the NFT transfer via a decimals-0 token balance that increased by 1.
 *   2. Fetch that NFT's on-chain royalty config (creators + sellerFeeBasisPoints).
 *   3. Estimate the sale price from the largest positive SOL balance delta.
 *   4. Sum the positive SOL deltas of the NFT's actual creator accounts as the
 *      royalty paid — rather than the previous stub that hard-coded `0n`.
 *
 * `expectedRoyaltyBps` is used as a fallback only when the NFT has no on-chain
 * royalty config; otherwise the on-chain sellerFeeBasisPoints takes precedence.
 */
export async function verifyRoyaltyPayment(
  connection: Connection,
  config: TokenConfig,
  transactionSignature: string,
  expectedRoyaltyBps: number,
): Promise<RoyaltyVerificationResult> {
  const tx = await connection.getParsedTransaction(transactionSignature, {
    maxSupportedTransactionVersion: 0,
  })

  if (!tx || !tx.meta) {
    throw new Error(`Transaction not found: ${transactionSignature}`)
  }

  const preBalances = tx.meta.preBalances
  const postBalances = tx.meta.postBalances
  const accounts = tx.transaction.message.accountKeys

  // Locate the NFT transfer: a token balance with 0 decimals that increased by 1.
  const preTokenBalances = tx.meta.preTokenBalances ?? []
  const postTokenBalances = tx.meta.postTokenBalances ?? []
  let nftMint: string | undefined
  for (const post of postTokenBalances) {
    const pre = preTokenBalances.find(
      p => p.accountIndex === post.accountIndex && p.mint === post.mint,
    )
    const preAmount = BigInt(pre?.uiTokenAmount?.amount ?? '0')
    const postAmount = BigInt(post.uiTokenAmount?.amount ?? '0')
    if (post.uiTokenAmount?.decimals === 0 && postAmount - preAmount === 1n) {
      nftMint = post.mint
      break
    }
  }

  // Resolve the NFT's on-chain royalty config (creators + fee bps) when available.
  let mint = PublicKey.default
  let royaltyBps = expectedRoyaltyBps
  let creatorAddresses = new Set<string>()
  if (nftMint) {
    mint = new PublicKey(nftMint)
    const royaltyInfo = await getRoyaltyInfo(mint, config)
    if (royaltyInfo.sellerFeeBasisPoints > 0) {
      royaltyBps = royaltyInfo.sellerFeeBasisPoints
    }
    creatorAddresses = new Set(royaltyInfo.creators.map(c => c.address.toBase58()))
  }

  // Estimate sale price and the buyer/seller from SOL balance deltas.
  let salePrice = BigInt(0)
  let seller = ''
  let maxSpent = BigInt(0)
  let buyer = ''
  let royaltyPaid = BigInt(0)

  for (let i = 0; i < accounts.length; i++) {
    const diff = BigInt(postBalances[i]) - BigInt(preBalances[i])
    if (diff > salePrice) {
      salePrice = diff
      seller = accounts[i].pubkey.toBase58()
    }
    // The buyer is the account whose balance dropped the most (paid the most out).
    if (diff < maxSpent) {
      maxSpent = diff
      buyer = accounts[i].pubkey.toBase58()
    }
    // Royalty paid = sum of positive SOL deltas landing on actual creator accounts.
    if (diff > 0n && creatorAddresses.has(accounts[i].pubkey.toBase58())) {
      royaltyPaid += diff
    }
  }

  const expectedRoyaltyAmount = (salePrice * BigInt(royaltyBps)) / BigInt(10000)
  const enforced = expectedRoyaltyAmount === 0n || royaltyPaid >= expectedRoyaltyAmount

  return {
    mint,
    expectedRoyaltyBps: royaltyBps,
    marketplace: 'unknown',
    enforced,
    actualRoyaltyPaid: royaltyPaid,
    expectedRoyaltyAmount,
    salePrice,
    seller,
    buyer,
    timestamp: tx.blockTime ?? 0,
    transactionSignature,
  }
}

/**
 * Generate a compliance report for a collection's royalties
 */
export function generateComplianceReport(
  results: RoyaltyVerificationResult[],
): RoyaltyComplianceReport {
  const byMarketplace: Record<string, { sales: number; compliant: number; rate: number }> = {}
  const violations: RoyaltyVerificationResult[] = []

  let totalRoyaltiesExpected = BigInt(0)
  let totalRoyaltiesPaid = BigInt(0)
  let compliantSales = 0

  for (const result of results) {
    totalRoyaltiesExpected += result.expectedRoyaltyAmount
    totalRoyaltiesPaid += result.actualRoyaltyPaid

    if (!byMarketplace[result.marketplace]) {
      byMarketplace[result.marketplace] = { sales: 0, compliant: 0, rate: 0 }
    }
    byMarketplace[result.marketplace].sales++

    if (result.enforced) {
      compliantSales++
      byMarketplace[result.marketplace].compliant++
    } else {
      violations.push(result)
    }
  }

  // Calculate rates
  for (const mp of Object.values(byMarketplace)) {
    mp.rate = mp.sales > 0 ? mp.compliant / mp.sales : 0
  }

  return {
    totalSales: results.length,
    compliantSales,
    nonCompliantSales: results.length - compliantSales,
    complianceRate: results.length > 0 ? compliantSales / results.length : 0,
    totalRoyaltiesExpected,
    totalRoyaltiesPaid,
    byMarketplace,
    violations,
  }
}
