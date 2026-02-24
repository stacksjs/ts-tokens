/**
 * Token-2022 Security Checks
 *
 * Security validation for Token-2022 extensions.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'
import type { AuditReport, AuditFinding } from './audit'
import type { TokenExtension } from '../types/token'

/**
 * Check transfer fee configuration
 */
export function checkTransferFee(feeBps: number, maxFee: bigint): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (feeBps > 500) {
    warnings.push(`Transfer fee is ${feeBps / 100}% — above 5% threshold`)
    recommendations.push('High transfer fees discourage trading and may indicate a rug pull')
  } else if (feeBps > 100) {
    warnings.push(`Transfer fee is ${feeBps / 100}%`)
    recommendations.push('Consider whether the transfer fee is appropriate for your use case')
  }

  if (maxFee === 0n) {
    warnings.push('Max fee is 0 — transfer fee extension is effectively disabled')
  }

  return { safe: feeBps <= 500, warnings, recommendations }
}

/**
 * Check transfer fee recipient address
 */
export function checkTransferFeeRecipient(recipient: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    new PublicKey(recipient)
  } catch {
    return {
      safe: false,
      warnings: ['Invalid transfer fee recipient address'],
      recommendations: ['Provide a valid Solana address for fee collection'],
    }
  }

  recommendations.push('Verify the transfer fee recipient is a controlled address')
  recommendations.push('Consider using a multisig for fee withdrawal authority')

  return { safe: true, warnings, recommendations }
}

/**
 * Check transfer hook program
 */
export function checkTransferHookProgram(programId: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const KNOWN_PROGRAMS: Record<string, string> = {
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022 Program',
  }

  if (!KNOWN_PROGRAMS[programId]) {
    warnings.push('Transfer hook uses an unknown program')
    recommendations.push('Verify the transfer hook program is audited and trusted')
    recommendations.push('Review the transfer hook program source code')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check if transfer hook source code is available
 */
export function checkTransferHookSource(_programId: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  warnings.push('Transfer hook programs should be verified on-chain')
  recommendations.push('Check if the program is verified on an explorer (e.g. Solscan, SolanaFM)')
  recommendations.push('Request the source code from the program deployer')

  return { safe: true, warnings, recommendations }
}

/**
 * Check permanent delegate extension
 */
export function checkPermanentDelegate(delegate: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  warnings.push('Permanent delegate is set — delegate can transfer or burn tokens from any account at any time')
  recommendations.push('Permanent delegate is a powerful capability — ensure it is intentional')
  recommendations.push('Users should be aware that their tokens can be moved without consent')

  return { safe: false, warnings, recommendations }
}

/**
 * Check permanent delegate address
 */
export function checkPermanentDelegateAddress(delegate: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    new PublicKey(delegate)
  } catch {
    return {
      safe: false,
      warnings: ['Invalid permanent delegate address'],
      recommendations: ['Provide a valid Solana address for permanent delegate'],
    }
  }

  recommendations.push('Verify the permanent delegate address is intended and controlled')

  return { safe: true, warnings, recommendations }
}

/**
 * Check default account state
 */
export function checkDefaultAccountState(state: 'initialized' | 'frozen'): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (state === 'frozen') {
    warnings.push('Default account state is frozen — new token accounts will be frozen by default')
    recommendations.push('Ensure you have a process to thaw accounts for legitimate users')
    recommendations.push('This is common for regulated tokens but unusual for general-purpose tokens')
  }

  return { safe: state !== 'frozen', warnings, recommendations }
}

/**
 * Check interest rate configuration
 */
export function checkInterestRate(rate: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (rate > 10000) {
    warnings.push(`Interest rate is ${rate} bps (${rate / 100}%) — unusually high`)
    recommendations.push('Verify the interest rate is sustainable and intended')
  } else if (rate < 0) {
    warnings.push('Negative interest rate detected')
    recommendations.push('Negative interest rates reduce token balances over time')
  }

  return { safe: rate >= 0 && rate <= 10000, warnings, recommendations }
}

/**
 * Run a full Token-2022 security check
 */
export async function fullToken2022SecurityCheck(
  _connection: Connection,
  mint: PublicKey,
  extensions: TokenExtension[]
): Promise<AuditReport> {
  const findings: AuditFinding[] = []
  const recommendations: string[] = []
  let riskScore = 0

  for (const ext of extensions) {
    switch (ext.type) {
      case 'transferFee': {
        const check = checkTransferFee(ext.feeBasisPoints, ext.maxFee)
        if (check.warnings.length > 0) {
          findings.push({ severity: check.safe ? 'medium' : 'high', category: 'extension', title: 'Transfer fee', description: check.warnings[0], recommendation: check.recommendations[0] })
          riskScore += check.safe ? 10 : 25
        }
        const recipientCheck = checkTransferFeeRecipient(ext.feeAuthority)
        recommendations.push(...recipientCheck.recommendations)
        break
      }

      case 'transferHook': {
        const check = checkTransferHookProgram(ext.programId)
        if (check.warnings.length > 0) {
          findings.push({ severity: 'medium', category: 'extension', title: 'Transfer hook', description: check.warnings[0], recommendation: check.recommendations[0] })
          riskScore += 15
        }
        recommendations.push(...check.recommendations)
        break
      }

      case 'permanentDelegate': {
        const check = checkPermanentDelegate(ext.delegate)
        findings.push({ severity: 'critical', category: 'extension', title: 'Permanent delegate', description: check.warnings[0], recommendation: check.recommendations[0] })
        riskScore += 35
        break
      }

      case 'defaultAccountState': {
        const check = checkDefaultAccountState(ext.state)
        if (check.warnings.length > 0) {
          findings.push({ severity: 'high', category: 'extension', title: 'Default frozen accounts', description: check.warnings[0], recommendation: check.recommendations[0] })
          riskScore += 20
        }
        break
      }

      case 'interestBearing': {
        const check = checkInterestRate(ext.rate)
        if (check.warnings.length > 0) {
          findings.push({ severity: check.safe ? 'low' : 'high', category: 'extension', title: 'Interest rate', description: check.warnings[0], recommendation: check.recommendations[0] })
          riskScore += check.safe ? 5 : 20
        }
        break
      }

      case 'nonTransferable':
        findings.push({ severity: 'info', category: 'extension', title: 'Non-transferable token', description: 'Token cannot be transferred between accounts (soulbound)' })
        break

      case 'confidentialTransfer':
        findings.push({ severity: 'info', category: 'extension', title: 'Confidential transfer', description: 'Token supports encrypted transfer amounts' })
        break

      case 'memoRequired':
        findings.push({ severity: 'info', category: 'extension', title: 'Memo required', description: 'Transfers require a memo instruction' })
        break

      case 'cpiGuard':
        findings.push({ severity: 'info', category: 'extension', title: 'CPI guard', description: 'Cross-program invocation guard is enabled' })
        break

      default:
        findings.push({ severity: 'info', category: 'extension', title: `Extension: ${(ext as any).type}`, description: 'Extension detected' })
    }
  }

  if (extensions.length === 0) {
    findings.push({ severity: 'info', category: 'extension', title: 'No extensions', description: 'No Token-2022 extensions configured' })
  }

  const summary = riskScore >= 60 ? 'High risk — critical Token-2022 extensions detected'
    : riskScore >= 30 ? 'Moderate risk — review extension configuration'
    : 'Low risk — extensions appear standard'

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
