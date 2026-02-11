/**
 * Collection Security Checks
 *
 * Security validation for NFT collections.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'
import type { AuditReport, AuditFinding } from './audit'
import { isValidCreatorShares } from './validation'

/**
 * Check collection authority configuration
 */
export function checkCollectionAuthority(authority: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (authority) {
    recommendations.push('Consider using a multisig for collection authority')
    recommendations.push('Ensure authority address is securely stored')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check royalty configuration and creator shares
 */
export function checkRoyaltyConfig(bps: number, creatorShares: number[]): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (bps > 5000) {
    warnings.push(`Royalty is ${bps / 100}% — very high`)
    recommendations.push('Royalties above 50% are unusual and may deter buyers')
  } else if (bps > 1000) {
    warnings.push(`Royalty is ${bps / 100}% — above typical range`)
  }

  const sharesCheck = isValidCreatorShares(creatorShares)
  if (!sharesCheck.valid) {
    warnings.push(`Creator shares invalid: ${sharesCheck.error}`)
    recommendations.push('Creator shares must sum to 100')
  }

  return { safe: warnings.filter(w => w.includes('invalid')).length === 0, warnings, recommendations }
}

/**
 * Check collection mutability
 */
export function checkCollectionMutability(isMutable: boolean): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (isMutable) {
    warnings.push('Collection metadata is mutable')
    recommendations.push('Consider making collection immutable after launch for user trust')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check collection update authority
 */
export function checkCollectionUpdateAuthority(authority: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  recommendations.push('Consider using a multisig for collection update authority')
  recommendations.push('Verify the update authority is the intended address')

  return { safe: true, warnings, recommendations }
}

/**
 * Check creator verification status
 */
export function checkCreatorVerification(creators: Array<{ address: string; verified: boolean; share: number }>): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const unverified = creators.filter(c => !c.verified)
  if (unverified.length > 0) {
    warnings.push(`${unverified.length} creator(s) are unverified`)
    recommendations.push('Verify all creators for marketplace visibility and authenticity')
  }

  return { safe: unverified.length === 0, warnings, recommendations }
}

/**
 * Run a full collection security check
 */
export async function fullCollectionSecurityCheck(
  connection: Connection,
  collectionMint: PublicKey
): Promise<AuditReport> {
  const findings: AuditFinding[] = []
  const recommendations: string[] = []
  let riskScore = 0

  try {
    const mintInfo = await connection.getAccountInfo(collectionMint)
    if (!mintInfo) {
      return {
        timestamp: new Date(),
        target: collectionMint.toBase58(),
        targetType: 'collection',
        riskScore: 100,
        findings: [{ severity: 'critical', category: 'existence', title: 'Collection not found', description: 'Collection mint does not exist on chain' }],
        recommendations: ['Verify the collection mint address'],
        summary: 'Collection not found on chain',
      }
    }

    // Check mint authority
    const data = mintInfo.data
    const hasMintAuthority = data[0] === 1
    if (hasMintAuthority) {
      findings.push({ severity: 'info', category: 'authority', title: 'Mint authority active', description: 'Collection mint authority is set — new items can be minted' })
    }

    const hasFreezeAuthority = data[36] === 1
    if (hasFreezeAuthority) {
      findings.push({ severity: 'medium', category: 'authority', title: 'Freeze authority active', description: 'Collection has freeze authority set', recommendation: 'Review if freeze authority is needed' })
      riskScore += 15
    }

    recommendations.push('Verify all NFTs in collection are properly verified')
    recommendations.push('Consider making collection metadata immutable after launch')

    findings.push({ severity: 'info', category: 'summary', title: 'Collection check complete', description: `Analyzed collection ${collectionMint.toBase58()}` })
  } catch (error) {
    findings.push({ severity: 'critical', category: 'error', title: 'Check failed', description: `Error: ${(error as Error).message}` })
    riskScore = 100
  }

  const summary = riskScore >= 50 ? 'Elevated risk — review findings'
    : riskScore >= 20 ? 'Moderate risk — some issues found'
    : 'Low risk — collection appears well-configured'

  return {
    timestamp: new Date(),
    target: collectionMint.toBase58(),
    targetType: 'collection',
    riskScore: Math.min(riskScore, 100),
    findings,
    recommendations,
    summary,
  }
}
