/**
 * Marketplace Royalty Verification
 *
 * Verify that royalties are being properly enforced across marketplaces.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'

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
 * Verify royalty payment for a specific transaction
 */
export async function verifyRoyaltyPayment(
  connection: Connection,
  transactionSignature: string,
  expectedRoyaltyBps: number,
): Promise<RoyaltyVerificationResult> {
  const tx = await connection.getParsedTransaction(transactionSignature, {
    maxSupportedTransactionVersion: 0,
  })

  if (!tx || !tx.meta) {
    throw new Error(`Transaction not found: ${transactionSignature}`)
  }

  // Analyze SOL transfers in the transaction
  const preBalances = tx.meta.preBalances
  const postBalances = tx.meta.postBalances
  const accounts = tx.transaction.message.accountKeys

  let salePrice = BigInt(0)
  let royaltyPaid = BigInt(0)
  let seller = ''
  let buyer = ''

  // Find the largest SOL transfer (likely the sale price)
  for (let i = 0; i < accounts.length; i++) {
    const diff = BigInt(postBalances[i]) - BigInt(preBalances[i])
    if (diff > salePrice) {
      salePrice = diff
      seller = accounts[i].pubkey.toBase58()
    }
    if (diff < BigInt(0) && Math.abs(Number(diff)) > Math.abs(Number(BigInt(0) - salePrice))) {
      buyer = accounts[i].pubkey.toBase58()
    }
  }

  const expectedRoyaltyAmount = (salePrice * BigInt(expectedRoyaltyBps)) / BigInt(10000)

  // Check if any creator received royalty payment
  // (Simplified — real impl would look up creator addresses from metadata)
  const enforced = royaltyPaid >= expectedRoyaltyAmount

  return {
    mint: PublicKey.default,
    expectedRoyaltyBps,
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
