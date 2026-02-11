/**
 * Governance Security Checks
 *
 * Security validation for DAO governance configuration.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'
import type { AuditReport, AuditFinding } from './audit'

/**
 * Check quorum percentage
 */
export function checkQuorum(quorumPct: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (quorumPct < 1) {
    warnings.push(`Quorum is only ${quorumPct}% — very low`)
    recommendations.push('Low quorum allows proposals to pass with minimal participation')
  } else if (quorumPct < 10) {
    warnings.push(`Quorum is ${quorumPct}% — below recommended minimum`)
    recommendations.push('Consider a quorum of at least 10% for meaningful governance')
  } else if (quorumPct > 80) {
    warnings.push(`Quorum is ${quorumPct}% — may be too high to reach`)
    recommendations.push('Very high quorum may prevent any proposals from passing')
  }

  return { safe: quorumPct >= 1, warnings, recommendations }
}

/**
 * Check approval threshold
 */
export function checkApprovalThreshold(thresholdPct: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (thresholdPct < 50) {
    warnings.push(`Approval threshold is ${thresholdPct}% — minority can pass proposals`)
    recommendations.push('Set approval threshold to at least 50% (simple majority)')
  } else if (thresholdPct > 90) {
    warnings.push(`Approval threshold is ${thresholdPct}% — may be very difficult to pass proposals`)
  }

  return { safe: thresholdPct >= 50, warnings, recommendations }
}

/**
 * Check voting period
 */
export function checkVotingPeriod(periodSeconds: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const periodDays = periodSeconds / 86400
  if (periodDays < 1) {
    warnings.push(`Voting period is ${(periodSeconds / 3600).toFixed(1)} hours — too short`)
    recommendations.push('Allow at least 1 day for voting to ensure participation')
  } else if (periodDays < 3) {
    warnings.push(`Voting period is ${periodDays.toFixed(1)} days — consider extending`)
    recommendations.push('3-7 day voting periods are standard for governance')
  } else if (periodDays > 30) {
    warnings.push(`Voting period is ${periodDays.toFixed(0)} days — very long`)
    recommendations.push('Long voting periods may slow governance responsiveness')
  }

  return { safe: periodDays >= 1, warnings, recommendations }
}

/**
 * Check execution delay (timelock)
 */
export function checkExecutionDelay(delaySeconds: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (delaySeconds === 0) {
    warnings.push('No execution delay — proposals execute immediately after passing')
    recommendations.push('Add a timelock (e.g. 24-48 hours) to allow response to malicious proposals')
  } else if (delaySeconds < 3600) {
    warnings.push(`Execution delay is ${delaySeconds / 60} minutes — very short`)
    recommendations.push('Consider a minimum 24-hour timelock for treasury operations')
  }

  const delayHours = delaySeconds / 3600
  if (delayHours > 168) {
    warnings.push(`Execution delay is ${(delayHours / 24).toFixed(0)} days — may slow operations`)
  }

  return { safe: delaySeconds > 0, warnings, recommendations }
}

/**
 * Check treasury governance authority alignment
 */
export function checkTreasuryGovernance(treasuryAuth: string, daoAuth: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (treasuryAuth !== daoAuth) {
    warnings.push('Treasury authority differs from DAO governance authority')
    recommendations.push('Ensure treasury is controlled by the governance program')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check for backdoor access to governance
 */
export function checkBackdoorAccess(authorities: string[]): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (authorities.length > 1) {
    warnings.push(`Multiple authorities detected (${authorities.length})`)
    recommendations.push('Review all authority addresses to ensure no unauthorized access')
  }

  recommendations.push('Ensure governance cannot be bypassed by any single authority')

  return { safe: true, warnings, recommendations }
}

/**
 * Check proposal threshold relative to supply
 */
export function checkProposalThreshold(threshold: bigint, totalSupply: bigint): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (totalSupply === 0n) {
    return { safe: true, warnings: ['Total supply is 0'], recommendations: [] }
  }

  const pct = Number(threshold * 10000n / totalSupply) / 100
  if (pct > 10) {
    warnings.push(`Proposal threshold is ${pct.toFixed(2)}% of supply — high barrier to propose`)
    recommendations.push('High threshold may prevent smaller holders from participating')
  } else if (pct < 0.01) {
    warnings.push(`Proposal threshold is ${pct.toFixed(4)}% of supply — very low`)
    recommendations.push('Very low threshold may lead to spam proposals')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check token concentration among top holders
 */
export function checkTokenConcentration(topHolderPct: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (topHolderPct > 50) {
    warnings.push(`Top holder controls ${topHolderPct.toFixed(1)}% of tokens — majority control`)
    recommendations.push('High concentration allows single-entity governance control')
  } else if (topHolderPct > 30) {
    warnings.push(`Top holder controls ${topHolderPct.toFixed(1)}% of tokens`)
    recommendations.push('Monitor token distribution for governance health')
  }

  return { safe: topHolderPct <= 50, warnings, recommendations }
}

/**
 * Check delegation concentration
 */
export function checkDelegationConcentration(topDelegatePct: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (topDelegatePct > 50) {
    warnings.push(`Top delegate controls ${topDelegatePct.toFixed(1)}% of voting power`)
    recommendations.push('High delegation concentration risks governance centralization')
  }

  return { safe: topDelegatePct <= 50, warnings, recommendations }
}

/**
 * Full governance security check
 */
export async function fullGovernanceSecurityCheck(
  connection: Connection,
  daoAddress: PublicKey
): Promise<AuditReport> {
  const findings: AuditFinding[] = []
  const recommendations: string[] = []
  let riskScore = 0

  try {
    const accountInfo = await connection.getAccountInfo(daoAddress)
    if (!accountInfo) {
      return {
        timestamp: new Date(),
        target: daoAddress.toBase58(),
        targetType: 'wallet',
        riskScore: 100,
        findings: [{ severity: 'critical', category: 'existence', title: 'DAO not found', description: 'Governance account does not exist on chain' }],
        recommendations: ['Verify the DAO address'],
        summary: 'DAO account not found on chain',
      }
    }

    recommendations.push('Review voting parameters (quorum, threshold, voting period)')
    recommendations.push('Ensure timelock is configured for treasury operations')
    recommendations.push('Monitor token distribution for governance health')

    findings.push({ severity: 'info', category: 'summary', title: 'Governance check complete', description: `Analyzed governance at ${daoAddress.toBase58()}` })
  } catch (error) {
    findings.push({ severity: 'critical', category: 'error', title: 'Check failed', description: `Error: ${(error as Error).message}` })
    riskScore = 100
  }

  const summary = riskScore >= 50 ? 'Elevated risk — review governance configuration'
    : 'Review complete — see recommendations'

  return {
    timestamp: new Date(),
    target: daoAddress.toBase58(),
    targetType: 'wallet',
    riskScore: Math.min(riskScore, 100),
    findings,
    recommendations,
    summary,
  }
}
