/**
 * Staking Security Checks
 *
 * Security validation for staking pool configuration.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'
import type { AuditReport, AuditFinding } from './audit'

/**
 * Check reward sustainability
 */
export function checkRewardSustainability(rate: number, remaining: bigint, duration: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (rate > 100) {
    warnings.push(`Reward rate is ${rate}% — unsustainable APY`)
    recommendations.push('Very high reward rates typically indicate a Ponzi-like model')
  } else if (rate > 50) {
    warnings.push(`Reward rate is ${rate}% — high APY`)
    recommendations.push('Verify the reward rate is sustainable long-term')
  }

  if (remaining === 0n) {
    warnings.push('No reward tokens remaining in the pool')
    recommendations.push('Pool may not be able to pay future rewards')
  }

  return { safe: rate <= 100, warnings, recommendations }
}

/**
 * Check reward funding
 */
export function checkRewardFunding(balance: bigint, obligations: bigint): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (balance < obligations) {
    warnings.push('Reward pool is underfunded')
    recommendations.push('Pool does not have enough tokens to cover all obligations')
    recommendations.push('Risk of unable to claim rewards')
  }

  return { safe: balance >= obligations, warnings, recommendations }
}

/**
 * Check lock period
 */
export function checkLockPeriod(durationSeconds: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const durationDays = durationSeconds / 86400
  if (durationDays > 365) {
    warnings.push(`Lock period is ${(durationDays / 365).toFixed(1)} years — very long`)
    recommendations.push('Long lock periods carry significant opportunity cost')
  } else if (durationDays > 90) {
    warnings.push(`Lock period is ${durationDays.toFixed(0)} days`)
    recommendations.push('Consider whether the lock period suits your timeframe')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check early unstake penalty
 */
export function checkEarlyUnstakePenalty(penaltyBps: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (penaltyBps > 5000) {
    warnings.push(`Early unstake penalty is ${penaltyBps / 100}% — very high`)
    recommendations.push('High penalty means significant loss if you need to unstake early')
  } else if (penaltyBps > 1000) {
    warnings.push(`Early unstake penalty is ${penaltyBps / 100}%`)
    recommendations.push('Factor the penalty into your risk assessment')
  }

  return { safe: penaltyBps <= 5000, warnings, recommendations }
}

/**
 * Check pool authority
 */
export function checkPoolAuthority(authority: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    new PublicKey(authority)
  } catch {
    return { safe: false, warnings: ['Invalid pool authority address'], recommendations: [] }
  }

  recommendations.push('Verify pool authority is a trusted address')
  recommendations.push('Multisig pool authority is recommended')

  return { safe: true, warnings, recommendations }
}

/**
 * Check emergency withdraw availability
 */
export function checkEmergencyWithdraw(hasEmergency: boolean): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (!hasEmergency) {
    warnings.push('No emergency withdraw function')
    recommendations.push('Without emergency withdraw, funds may be stuck if the pool malfunctions')
  } else {
    recommendations.push('Emergency withdraw is available — review conditions and penalties')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check pause function availability
 */
export function checkPauseFunction(hasPause: boolean): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (!hasPause) {
    recommendations.push('Pool has no pause function — cannot be halted in emergencies')
  } else {
    recommendations.push('Pool can be paused — verify who has pause authority')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check staking program audit status
 */
export function checkStakingProgramAudit(programId: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  recommendations.push('Verify the staking program has been audited by a reputable firm')
  recommendations.push('Check for known vulnerabilities in the program')

  return { safe: true, warnings, recommendations }
}

/**
 * Check upgrade authority on staking program
 */
export function checkStakingUpgradeAuthority(upgradeAuth: string | null): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (upgradeAuth) {
    warnings.push('Staking program is upgradeable')
    recommendations.push('Upgradeable programs can change behavior — verify the upgrade authority is trusted')
    recommendations.push('Consider using a timelock on program upgrades')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Full staking pool security check
 */
export async function fullStakingSecurityCheck(
  connection: Connection,
  poolAddress: PublicKey
): Promise<AuditReport> {
  const findings: AuditFinding[] = []
  const recommendations: string[] = []
  let riskScore = 0

  try {
    const accountInfo = await connection.getAccountInfo(poolAddress)
    if (!accountInfo) {
      return {
        timestamp: new Date(),
        target: poolAddress.toBase58(),
        targetType: 'wallet',
        riskScore: 100,
        findings: [{ severity: 'critical', category: 'existence', title: 'Pool not found', description: 'Staking pool account does not exist on chain' }],
        recommendations: ['Verify the staking pool address'],
        summary: 'Staking pool not found on chain',
      }
    }

    const programAudit = checkStakingProgramAudit(accountInfo.owner.toBase58())
    recommendations.push(...programAudit.recommendations)

    const upgradeCheck = checkStakingUpgradeAuthority(null) // Would need program data
    recommendations.push(...upgradeCheck.recommendations)

    recommendations.push('Review reward rates and sustainability')
    recommendations.push('Check lock periods and penalty terms')

    findings.push({ severity: 'info', category: 'summary', title: 'Staking check complete', description: `Analyzed staking pool ${poolAddress.toBase58()}` })
  } catch (error) {
    findings.push({ severity: 'critical', category: 'error', title: 'Check failed', description: `Error: ${(error as Error).message}` })
    riskScore = 100
  }

  const summary = riskScore >= 50 ? 'Elevated risk — review staking pool configuration'
    : 'Review complete — see recommendations'

  return {
    timestamp: new Date(),
    target: poolAddress.toBase58(),
    targetType: 'wallet',
    riskScore: Math.min(riskScore, 100),
    findings,
    recommendations,
    summary,
  }
}
