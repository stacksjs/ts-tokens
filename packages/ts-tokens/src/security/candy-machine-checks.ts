/**
 * Candy Machine Security Checks
 *
 * Security validation for Candy Machine v3 configuration.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'
import type { AuditReport, AuditFinding } from './audit'

/**
 * Check mint price
 */
export function checkMintPrice(priceLamports: bigint): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const priceSOL = Number(priceLamports) / LAMPORTS_PER_SOL
  if (priceSOL > 10) {
    warnings.push(`Mint price is ${priceSOL} SOL — high for most collections`)
    recommendations.push('Verify the mint price is set correctly')
  }

  if (priceLamports === 0n) {
    warnings.push('Mint price is 0 — free mint')
    recommendations.push('Consider adding bot protection for free mints')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check payment destination
 */
export function checkPaymentDestination(destination: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    new PublicKey(destination)
  } catch {
    return {
      safe: false,
      warnings: ['Invalid payment destination address'],
      recommendations: ['Provide a valid Solana address for payment collection'],
    }
  }

  recommendations.push('Verify the payment destination is a controlled address')
  recommendations.push('Consider using a multisig for payment collection')

  return { safe: true, warnings, recommendations }
}

/**
 * Check guard start/end dates
 */
export function checkGuardDates(startDate?: bigint, endDate?: bigint): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const now = BigInt(Math.floor(Date.now() / 1000))

  if (startDate && startDate > now + 86400n * 365n) {
    warnings.push('Start date is more than 1 year in the future')
    recommendations.push('Verify the start date is correct')
  }

  if (endDate && endDate < now) {
    warnings.push('End date is in the past — minting is closed')
  }

  if (startDate && endDate && endDate <= startDate) {
    warnings.push('End date is before or equal to start date')
    recommendations.push('End date must be after start date')
  }

  return { safe: warnings.filter(w => w.includes('before or equal')).length === 0, warnings, recommendations }
}

/**
 * Check allowlist merkle root
 */
export function checkAllowlistMerkleRoot(root: Uint8Array): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (root.length !== 32) {
    warnings.push('Invalid merkle root length')
    recommendations.push('Merkle root must be 32 bytes')
    return { safe: false, warnings, recommendations }
  }

  const isEmpty = root.every(b => b === 0)
  if (isEmpty) {
    warnings.push('Merkle root is all zeros — allowlist may be empty or misconfigured')
    recommendations.push('Verify the merkle root was generated from the allowlist')
  }

  return { safe: !isEmpty, warnings, recommendations }
}

/**
 * Check mint limits
 */
export function checkMintLimits(limit: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (limit === 0) {
    warnings.push('Mint limit is 0 — no mints possible')
    recommendations.push('Set a positive mint limit')
  } else if (limit > 100) {
    warnings.push(`Mint limit is ${limit} per wallet — may allow concentration`)
    recommendations.push('Consider a lower per-wallet mint limit for fairer distribution')
  }

  return { safe: limit > 0, warnings, recommendations }
}

/**
 * Check if bot tax is configured
 */
export function checkBotTax(guards: { botTax?: { lamports: bigint } }): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (!guards.botTax) {
    recommendations.push('Consider enabling bot tax to deter automated minting bots')
  } else if (Number(guards.botTax.lamports) / LAMPORTS_PER_SOL < 0.01) {
    warnings.push('Bot tax is very low and may not deter bots')
    recommendations.push('Consider increasing bot tax to at least 0.01 SOL')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Run a full Candy Machine security check
 */
export async function fullCandyMachineSecurityCheck(
  connection: Connection,
  cmAddress: PublicKey
): Promise<AuditReport> {
  const findings: AuditFinding[] = []
  const recommendations: string[] = []
  let riskScore = 0

  try {
    const accountInfo = await connection.getAccountInfo(cmAddress)
    if (!accountInfo) {
      return {
        timestamp: new Date(),
        target: cmAddress.toBase58(),
        targetType: 'candy-machine',
        riskScore: 100,
        findings: [{ severity: 'critical', category: 'existence', title: 'Candy Machine not found', description: 'Account does not exist on chain' }],
        recommendations: ['Verify the Candy Machine address'],
        summary: 'Candy Machine not found on chain',
      }
    }

    // Check owner program
    const owner = accountInfo.owner.toBase58()
    const CANDY_MACHINE_V3 = 'CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR'
    if (owner !== CANDY_MACHINE_V3) {
      findings.push({ severity: 'high', category: 'ownership', title: 'Unexpected owner program', description: `Account owned by ${owner}, expected Candy Machine V3`, recommendation: 'Verify this is a valid Candy Machine account' })
      riskScore += 30
    }

    recommendations.push('Verify guard configuration matches intended mint parameters')
    recommendations.push('Test minting on devnet before mainnet launch')

    findings.push({ severity: 'info', category: 'summary', title: 'Candy Machine check complete', description: `Analyzed Candy Machine ${cmAddress.toBase58()}` })
  } catch (error) {
    findings.push({ severity: 'critical', category: 'error', title: 'Check failed', description: `Error: ${(error as Error).message}` })
    riskScore = 100
  }

  const summary = riskScore >= 50 ? 'Elevated risk — review Candy Machine configuration'
    : riskScore >= 20 ? 'Moderate risk — some issues found'
    : 'Low risk — Candy Machine appears well-configured'

  return {
    timestamp: new Date(),
    target: cmAddress.toBase58(),
    targetType: 'candy-machine',
    riskScore: Math.min(riskScore, 100),
    findings,
    recommendations,
    summary,
  }
}
