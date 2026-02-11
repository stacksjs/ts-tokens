/**
 * Program Security Checks
 *
 * Verification and security analysis for Solana programs.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'
import type { AuditReport, AuditFinding } from './audit'
import { KNOWN_PROGRAMS } from '../debug/types'

const BPF_LOADER_UPGRADEABLE = 'BPFLoaderUpgradeab1e11111111111111111111111'

/**
 * Check if program is verified on-chain
 */
export async function checkProgramVerified(connection: Connection, programId: PublicKey): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    const accountInfo = await connection.getAccountInfo(programId)
    if (!accountInfo) {
      return { safe: false, warnings: ['Program account not found'], recommendations: ['Verify the program ID'] }
    }

    if (!accountInfo.executable) {
      return { safe: false, warnings: ['Account is not executable — not a program'], recommendations: ['Verify this is a program address'] }
    }

    const programName = KNOWN_PROGRAMS[programId.toBase58()]
    if (programName) {
      recommendations.push(`Known program: ${programName}`)
    } else {
      warnings.push('Program is not in the known programs registry')
      recommendations.push('Verify the program is audited and trusted before interacting')
    }
  } catch (error) {
    warnings.push(`Could not verify program: ${(error as Error).message}`)
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check program upgrade authority
 */
export async function checkUpgradeAuthority(connection: Connection, programId: PublicKey): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    const accountInfo = await connection.getAccountInfo(programId)
    if (accountInfo && accountInfo.owner.toBase58() === BPF_LOADER_UPGRADEABLE) {
      warnings.push('Program is upgradeable — code can be changed')
      recommendations.push('Check the upgrade authority and ensure it is trusted')
      recommendations.push('Prefer immutable programs or programs with timelock-governed upgrades')
    }
  } catch {
    warnings.push('Could not check upgrade authority')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check if program is upgradeable by an unknown authority
 */
export function checkUpgradeableByUnknown(upgradeAuth: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (upgradeAuth) {
    warnings.push(`Program upgrade authority: ${upgradeAuth}`)
    recommendations.push('Verify the upgrade authority is a known, trusted entity')
    recommendations.push('Programs controlled by unknown authorities pose higher risk')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check for known vulnerabilities in a program
 */
export function checkKnownVulnerabilities(programId: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Placeholder — in production, check against a vulnerability database
  recommendations.push('Check program audit reports for known vulnerabilities')

  return { safe: true, warnings, recommendations }
}

/**
 * Check CPI (Cross-Program Invocation) targets
 */
export function checkCpiPrograms(instructions: Array<{ programId: string }>): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const unknownPrograms = instructions.filter(ix => !KNOWN_PROGRAMS[ix.programId])
  if (unknownPrograms.length > 0) {
    warnings.push(`${unknownPrograms.length} instruction(s) target unknown programs`)
    recommendations.push('Verify all target programs are trusted before signing')
    for (const ix of unknownPrograms) {
      warnings.push(`Unknown program: ${ix.programId}`)
    }
  }

  return { safe: unknownPrograms.length === 0, warnings, recommendations }
}

/**
 * Check for unverified programs in a transaction
 */
export function checkUnverifiedPrograms(programIds: string[]): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const unverified = programIds.filter(id => !KNOWN_PROGRAMS[id])
  if (unverified.length > 0) {
    warnings.push(`${unverified.length} unverified program(s) in transaction`)
    recommendations.push('Only interact with verified and audited programs')
  }

  return { safe: unverified.length === 0, warnings, recommendations }
}

/**
 * Check for sandwich attack vectors
 */
export function checkSandwichVectors(instructions: Array<{ programId: string; data?: string }>): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // DEX swap instructions are vulnerable to sandwich attacks
  const DEX_PROGRAMS = [
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca
  ]

  const swapIxs = instructions.filter(ix => DEX_PROGRAMS.includes(ix.programId))
  if (swapIxs.length > 0) {
    warnings.push('Transaction contains DEX swap instructions — vulnerable to sandwich attacks')
    recommendations.push('Use slippage protection and consider private transaction submission')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check if program IDL is available
 */
export function checkIdlAvailable(programId: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Placeholder — in production, check for IDL account on chain
  recommendations.push('Programs with published IDLs are more transparent and easier to audit')

  return { safe: true, warnings, recommendations }
}

/**
 * Full program security check
 */
export async function fullProgramSecurityCheck(
  connection: Connection,
  programId: PublicKey
): Promise<AuditReport> {
  const findings: AuditFinding[] = []
  const recommendations: string[] = []
  let riskScore = 0

  const verifiedCheck = await checkProgramVerified(connection, programId)
  if (verifiedCheck.warnings.length > 0) {
    findings.push({ severity: 'medium', category: 'verification', title: 'Unverified program', description: verifiedCheck.warnings[0], recommendation: verifiedCheck.recommendations[0] })
    riskScore += 20
  }
  recommendations.push(...verifiedCheck.recommendations)

  const upgradeCheck = await checkUpgradeAuthority(connection, programId)
  if (upgradeCheck.warnings.length > 0) {
    findings.push({ severity: 'medium', category: 'upgradeability', title: 'Upgradeable program', description: upgradeCheck.warnings[0], recommendation: upgradeCheck.recommendations[0] })
    riskScore += 15
  }
  recommendations.push(...upgradeCheck.recommendations)

  findings.push({ severity: 'info', category: 'summary', title: 'Program check complete', description: `Analyzed program ${programId.toBase58()}` })

  const summary = riskScore >= 50 ? 'Elevated risk — review program security'
    : riskScore >= 20 ? 'Moderate risk — some concerns found'
    : 'Low risk — program appears verified'

  return {
    timestamp: new Date(),
    target: programId.toBase58(),
    targetType: 'token',
    riskScore: Math.min(riskScore, 100),
    findings,
    recommendations,
    summary,
  }
}
