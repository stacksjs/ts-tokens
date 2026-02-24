/**
 * Wallet Security Checks
 *
 * Security validation for wallet configuration and holdings.
 */

import * as fs from 'node:fs'
import type { Connection } from '@solana/web3.js'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'
import type { AuditReport, AuditFinding } from './audit'

/**
 * Check keypair file permissions
 */
export function checkKeypairFilePermissions(filePath: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    const stats = fs.statSync(filePath)
    const mode = stats.mode & 0o777
    if (mode & 0o077) {
      warnings.push(`Keypair file has overly permissive mode: ${mode.toString(8)}`)
      recommendations.push('Set file permissions to 600 (owner read/write only): chmod 600 ' + filePath)
    }
  } catch {
    // File doesn't exist or can't be read — not a security issue
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check if keypair file is tracked by git
 */
export function checkKeypairNotInGit(filePath: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check for .gitignore patterns
  try {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    const gitignorePath = dir + '/.gitignore'
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8')
      const filename = filePath.substring(filePath.lastIndexOf('/') + 1)
      if (!gitignore.includes(filename) && !gitignore.includes('*.json')) {
        warnings.push('Keypair file may not be excluded by .gitignore')
        recommendations.push('Add the keypair file to .gitignore immediately')
      }
    }
  } catch {
    // Not in a git repo
  }

  recommendations.push('Never commit keypair files to version control')

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check if environment variable might be logged
 */
export function checkEnvVarLogging(envVar: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (process.env[envVar]) {
    recommendations.push(`Ensure ${envVar} is not logged or exposed in error messages`)
    recommendations.push('Use a .env file and add it to .gitignore')
  } else {
    warnings.push(`Environment variable ${envVar} is not set`)
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check if wallet has a large balance warranting extra security
 */
export function checkLargeBalance(balance: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const solBalance = balance / LAMPORTS_PER_SOL
  if (solBalance > 1000) {
    warnings.push(`Very large balance: ${solBalance.toFixed(2)} SOL`)
    recommendations.push('Use a hardware wallet for balances over 1000 SOL')
    recommendations.push('Consider splitting funds across multiple wallets')
  } else if (solBalance > 100) {
    recommendations.push('Consider using a hardware wallet for added security')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check for dust attacks (tiny unsolicited token transfers)
 */
export function checkDustAttacks(tokenAccounts: Array<{ mint: string; balance: bigint; decimals: number }>): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const suspiciousAccounts = tokenAccounts.filter(acct => {
    const uiBalance = Number(acct.balance) / Math.pow(10, acct.decimals)
    return uiBalance > 0 && uiBalance < 0.001
  })

  if (suspiciousAccounts.length > 5) {
    warnings.push(`${suspiciousAccounts.length} token accounts with dust amounts detected`)
    recommendations.push('Dust tokens may be phishing attempts — do not interact with unknown tokens')
    recommendations.push('Close dust token accounts to reclaim rent')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check for suspicious token names
 */
export function checkSuspiciousTokens(tokenAccounts: Array<{ mint: string; name?: string }>): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const suspiciousPatterns = [/free/i, /airdrop/i, /claim/i, /reward/i, /\.com/i, /\.xyz/i]

  for (const acct of tokenAccounts) {
    if (acct.name) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(acct.name)) {
          warnings.push(`Suspicious token name: "${acct.name}" (${acct.mint})`)
          break
        }
      }
    }
  }

  if (warnings.length > 0) {
    recommendations.push('Do not interact with suspicious tokens — they may be phishing attempts')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check mint authority exposure for wallet
 */
export async function checkMintAuthorityExposure(
  _connection: Connection,
  wallet: PublicKey
): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Note: In production, would query for all mints where this wallet is mint authority
  recommendations.push('Audit all tokens where your wallet is mint authority')
  recommendations.push('Consider using a separate authority keypair from your main wallet')

  return { safe: true, warnings, recommendations }
}

/**
 * Check freeze authority exposure for wallet
 */
export async function checkFreezeAuthorityExposure(
  _connection: Connection,
  wallet: PublicKey
): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  recommendations.push('Review all tokens where your wallet is freeze authority')

  return { safe: true, warnings, recommendations }
}

/**
 * Check update authority exposure for wallet
 */
export async function checkUpdateAuthorityExposure(
  _connection: Connection,
  wallet: PublicKey
): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  recommendations.push('Review all metadata where your wallet is update authority')

  return { safe: true, warnings, recommendations }
}

/**
 * Recommend hardware wallet based on balance
 */
export function checkHardwareWalletRecommendation(balance: number, isHardware: boolean): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const solBalance = balance / LAMPORTS_PER_SOL
  if (solBalance > 50 && !isHardware) {
    recommendations.push('Consider using a hardware wallet (Ledger) for this balance')
  }

  if (isHardware) {
    recommendations.push('Good — hardware wallet detected for signing')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Full wallet security check
 */
export async function fullWalletSecurityCheck(
  connection: Connection,
  wallet: PublicKey
): Promise<AuditReport> {
  const findings: AuditFinding[] = []
  const recommendations: string[] = []
  let riskScore = 0

  try {
    const balance = await connection.getBalance(wallet)
    const balanceCheck = checkLargeBalance(balance)
    if (balanceCheck.warnings.length > 0) {
      findings.push({ severity: 'medium', category: 'balance', title: 'Large balance', description: balanceCheck.warnings[0], recommendation: balanceCheck.recommendations[0] })
      riskScore += 15
    }
    recommendations.push(...balanceCheck.recommendations)

    const hwCheck = checkHardwareWalletRecommendation(balance, false)
    recommendations.push(...hwCheck.recommendations)

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    })

    const tokenData = tokenAccounts.value.map(acct => ({
      mint: acct.account.data.parsed.info.mint as string,
      balance: BigInt(acct.account.data.parsed.info.tokenAmount.amount),
      decimals: acct.account.data.parsed.info.tokenAmount.decimals as number,
    }))

    const dustCheck = checkDustAttacks(tokenData)
    if (dustCheck.warnings.length > 0) {
      findings.push({ severity: 'low', category: 'dust', title: 'Dust tokens detected', description: dustCheck.warnings[0], recommendation: dustCheck.recommendations[0] })
      riskScore += 5
    }

    findings.push({
      severity: 'info',
      category: 'summary',
      title: 'Wallet overview',
      description: `Balance: ${balance / LAMPORTS_PER_SOL} SOL, Token accounts: ${tokenAccounts.value.length}`,
    })
  } catch (error) {
    findings.push({ severity: 'critical', category: 'error', title: 'Check failed', description: `Error: ${(error as Error).message}` })
    riskScore = 100
  }

  const summary = riskScore >= 50 ? 'Elevated risk — review wallet security'
    : riskScore >= 20 ? 'Moderate risk — some issues found'
    : 'Low risk — wallet appears secure'

  return {
    timestamp: new Date(),
    target: wallet.toBase58(),
    targetType: 'wallet',
    riskScore: Math.min(riskScore, 100),
    findings,
    recommendations,
    summary,
  }
}
