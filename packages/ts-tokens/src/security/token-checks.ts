/**
 * Token Security Checks
 *
 * Security validation for SPL token configuration and metadata.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'
import type { AuditReport, AuditFinding } from './audit'
import { isValidUri } from './validation'

/**
 * Check if mint authority is set and whether it's a multisig
 */
export function checkMintAuthority(mintAuth: string | null): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (mintAuth) {
    warnings.push('Mint authority is set — new tokens can be minted at any time')
    recommendations.push('Consider revoking mint authority for fixed-supply tokens')
    recommendations.push('If mint authority is needed, use a multisig for safety')
  }

  return { safe: !mintAuth, warnings, recommendations }
}

/**
 * Check if freeze authority exists
 */
export function checkFreezeAuthority(freezeAuth: string | null): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (freezeAuth) {
    warnings.push('Freeze authority is set — any token account can be frozen')
    recommendations.push('Revoke freeze authority for trustless tokens')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Verify supply and decimals configuration
 */
export function checkSupplyVerification(supply: bigint, decimals: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (decimals < 0 || decimals > 9) {
    warnings.push(`Unusual decimals value: ${decimals}`)
    recommendations.push('Standard tokens use 0-9 decimals')
  }

  const uiSupply = Number(supply) / Math.pow(10, decimals)
  if (uiSupply > 1_000_000_000_000) {
    warnings.push('Extremely large supply detected')
    recommendations.push('Verify the supply and decimals are configured correctly')
  }

  if (supply === 0n) {
    warnings.push('Token has zero supply')
    recommendations.push('Verify that tokens have been minted')
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check metadata URI accessibility
 */
export async function checkMetadataAccessibility(uri: string): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  const uriCheck = isValidUri(uri)
  if (!uriCheck.valid) {
    return {
      safe: false,
      warnings: [`Invalid metadata URI: ${uriCheck.error}`],
      recommendations: ['Provide a valid metadata URI using http, https, ipfs, or ar protocol'],
    }
  }

  if (uri.startsWith('http://')) {
    warnings.push('Metadata URI uses insecure HTTP')
    recommendations.push('Use HTTPS for metadata URIs')
  }

  try {
    const response = await fetch(uri, { method: 'HEAD', signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      warnings.push(`Metadata URI returned status ${response.status}`)
      recommendations.push('Ensure metadata URI is publicly accessible')
    }
  } catch {
    warnings.push('Metadata URI is not accessible')
    recommendations.push('Verify the metadata URI is reachable and returns valid JSON')
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Verify on-chain metadata matches off-chain metadata
 */
export function checkMetadataMatch(
  onChainName: string,
  onChainSymbol: string,
  offChainName: string,
  offChainSymbol: string
): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (onChainName.trim() !== offChainName.trim()) {
    warnings.push(`Name mismatch: on-chain "${onChainName}" vs off-chain "${offChainName}"`)
    recommendations.push('Ensure on-chain and off-chain names match')
  }

  if (onChainSymbol.trim() !== offChainSymbol.trim()) {
    warnings.push(`Symbol mismatch: on-chain "${onChainSymbol}" vs off-chain "${offChainSymbol}"`)
    recommendations.push('Ensure on-chain and off-chain symbols match')
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check if metadata is mutable
 */
export function checkMetadataMutability(isMutable: boolean): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (isMutable) {
    warnings.push('Token metadata is mutable — name, symbol, and URI can be changed')
    recommendations.push('Consider making metadata immutable after launch for user trust')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check update authority configuration
 */
export function checkUpdateAuthority(authority: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (authority) {
    recommendations.push('Verify update authority is a controlled address')
    recommendations.push('Consider using a multisig for update authority')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check if image URL is accessible
 */
export async function checkImageAccessibility(imageUrl: string): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (!imageUrl) {
    warnings.push('No image URL provided')
    recommendations.push('Add an image URL for marketplace display')
    return { safe: true, warnings, recommendations }
  }

  try {
    const response = await fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      warnings.push(`Image URL returned status ${response.status}`)
      recommendations.push('Ensure image URL is publicly accessible')
    }
    const contentType = response.headers.get('content-type')
    if (contentType && !contentType.startsWith('image/')) {
      warnings.push(`Image URL returned non-image content type: ${contentType}`)
      recommendations.push('Image URL should return an image content type')
    }
  } catch {
    warnings.push('Image URL is not accessible')
    recommendations.push('Verify the image URL is reachable')
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check token age based on creation slot
 */
export function checkTokenAge(createdSlot: number, currentSlot: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const slotDiff = currentSlot - createdSlot
  // Roughly 2.5 slots/second, so ~86400 slots per day
  const estimatedDays = slotDiff / 86400

  if (estimatedDays < 1) {
    warnings.push('Token was created less than 1 day ago')
    recommendations.push('Exercise caution with very new tokens')
  } else if (estimatedDays < 7) {
    warnings.push('Token was created less than 7 days ago')
    recommendations.push('New tokens carry higher risk — research the project thoroughly')
  }

  return { safe: estimatedDays >= 1, warnings, recommendations }
}

/**
 * Check holder count
 */
export function checkHolderCount(holderCount: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (holderCount === 0) {
    warnings.push('Token has no holders')
    recommendations.push('Verify the token has been distributed')
  } else if (holderCount < 10) {
    warnings.push(`Token has very few holders (${holderCount})`)
    recommendations.push('Low holder count may indicate low liquidity or early stage')
  }

  return { safe: holderCount > 0, warnings, recommendations }
}

/**
 * Check if address matches known scam patterns
 */
export function checkKnownScamAddress(address: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Pattern-based checks (placeholder for real scam database)
  try {
    new PublicKey(address)
  } catch {
    return {
      safe: false,
      warnings: ['Invalid address format'],
      recommendations: ['Verify the address is a valid Solana public key'],
    }
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Run a full token security check
 */
export async function fullTokenSecurityCheck(
  connection: Connection,
  mint: PublicKey
): Promise<AuditReport> {
  const findings: AuditFinding[] = []
  const recommendations: string[] = []
  let riskScore = 0

  try {
    const mintInfo = await connection.getAccountInfo(mint)
    if (!mintInfo) {
      return {
        timestamp: new Date(),
        target: mint.toBase58(),
        targetType: 'token',
        riskScore: 100,
        findings: [{ severity: 'critical', category: 'existence', title: 'Token not found', description: 'Mint account does not exist on chain' }],
        recommendations: ['Verify the mint address is correct'],
        summary: 'Token not found on chain',
      }
    }

    const data = mintInfo.data
    const hasMintAuthority = data[0] === 1
    const mintAuth = hasMintAuthority ? new PublicKey(data.subarray(4, 36)).toBase58() : null

    const maCheck = checkMintAuthority(mintAuth)
    if (maCheck.warnings.length > 0) {
      findings.push({ severity: 'medium', category: 'authority', title: 'Mint authority active', description: maCheck.warnings[0], recommendation: maCheck.recommendations[0] })
      riskScore += 20
    }
    recommendations.push(...maCheck.recommendations)

    const hasFreezeAuthority = data[36] === 1
    const freezeAuth = hasFreezeAuthority ? new PublicKey(data.subarray(40, 72)).toBase58() : null

    const faCheck = checkFreezeAuthority(freezeAuth)
    if (faCheck.warnings.length > 0) {
      findings.push({ severity: 'high', category: 'authority', title: 'Freeze authority active', description: faCheck.warnings[0], recommendation: faCheck.recommendations[0] })
      riskScore += 25
    }
    recommendations.push(...faCheck.recommendations)

    const currentSlot = await connection.getSlot()
    const txSigs = await connection.getSignaturesForAddress(mint, { limit: 1 })
    if (txSigs.length > 0 && txSigs[0].slot) {
      const ageCheck = checkTokenAge(txSigs[0].slot, currentSlot)
      if (ageCheck.warnings.length > 0) {
        findings.push({ severity: 'medium', category: 'age', title: 'New token', description: ageCheck.warnings[0] })
        riskScore += 15
      }
    }

    findings.push({ severity: 'info', category: 'summary', title: 'Token security check complete', description: `Analyzed mint ${mint.toBase58()}` })

  } catch (error) {
    findings.push({ severity: 'critical', category: 'error', title: 'Check failed', description: `Error: ${(error as Error).message}` })
    riskScore = 100
  }

  const summary = riskScore >= 60 ? 'High risk — review findings carefully'
    : riskScore >= 30 ? 'Moderate risk — some issues found'
    : 'Low risk — no major issues detected'

  return {
    timestamp: new Date(),
    target: mint.toBase58(),
    targetType: 'token',
    riskScore: Math.min(riskScore, 100),
    findings,
    recommendations,
    summary,
  }
}
