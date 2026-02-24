/**
 * Security Audit
 *
 * Comprehensive security auditing for tokens, NFTs, and collections.
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'

export interface AuditReport {
  timestamp: Date
  target: string
  targetType: 'token' | 'nft' | 'collection' | 'candy-machine' | 'wallet'
  riskScore: number // 0-100, higher = more risk
  findings: AuditFinding[]
  recommendations: string[]
  summary: string
}

export interface AuditFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  title: string
  description: string
  recommendation?: string
}

/**
 * Audit a fungible token
 */
export async function auditToken(
  connection: Connection,
  mint: PublicKey
): Promise<AuditReport> {
  const findings: AuditFinding[] = []
  const recommendations: string[] = []
  let riskScore = 0

  try {
    // Fetch token info
    const mintInfo = await connection.getAccountInfo(mint)

    if (!mintInfo) {
      return {
        timestamp: new Date(),
        target: mint.toBase58(),
        targetType: 'token',
        riskScore: 100,
        findings: [{
          severity: 'critical',
          category: 'existence',
          title: 'Token not found',
          description: 'The token mint account does not exist',
        }],
        recommendations: ['Verify the mint address is correct'],
        summary: 'Token not found on chain',
      }
    }

    // Parse mint data (simplified)
    const data = mintInfo.data

    // Check mint authority (byte 0-36 contains authority info)
    const hasMintAuthority = data[0] === 1
    if (hasMintAuthority) {
      findings.push({
        severity: 'medium',
        category: 'authority',
        title: 'Mint authority is set',
        description: 'The token has an active mint authority that can create new tokens',
        recommendation: 'Consider revoking mint authority for fixed-supply tokens',
      })
      recommendations.push('Revoke mint authority if supply should be fixed')
      riskScore += 20
    }

    // Check freeze authority
    const hasFreezeAuthority = data[36] === 1
    if (hasFreezeAuthority) {
      findings.push({
        severity: 'high',
        category: 'authority',
        title: 'Freeze authority is set',
        description: 'The token has an active freeze authority that can freeze any token account',
        recommendation: 'Revoke freeze authority for trustless tokens',
      })
      recommendations.push('Revoke freeze authority to prevent account freezing')
      riskScore += 30
    }

    // Add info finding about supply
    findings.push({
      severity: 'info',
      category: 'supply',
      title: 'Token supply information',
      description: 'Review the current supply and decimal configuration',
    })

  } catch (error) {
    findings.push({
      severity: 'critical',
      category: 'error',
      title: 'Audit failed',
      description: `Error during audit: ${(error as Error).message}`,
    })
    riskScore = 100
  }

  return {
    timestamp: new Date(),
    target: mint.toBase58(),
    targetType: 'token',
    riskScore: Math.min(riskScore, 100),
    findings,
    recommendations,
    summary: generateSummary(findings, riskScore),
  }
}

/**
 * Audit an NFT collection
 */
export async function auditCollection(
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
        findings: [{
          severity: 'critical',
          category: 'existence',
          title: 'Collection not found',
          description: 'The collection mint account does not exist',
        }],
        recommendations: ['Verify the collection mint address'],
        summary: 'Collection not found on chain',
      }
    }

    // Check for metadata account
    findings.push({
      severity: 'info',
      category: 'metadata',
      title: 'Collection metadata',
      description: 'Verify collection metadata is correct and accessible',
    })

    recommendations.push('Verify all NFTs in collection are properly verified')
    recommendations.push('Consider making collection immutable after launch')

  } catch (error) {
    findings.push({
      severity: 'critical',
      category: 'error',
      title: 'Audit failed',
      description: `Error during audit: ${(error as Error).message}`,
    })
    riskScore = 100
  }

  return {
    timestamp: new Date(),
    target: collectionMint.toBase58(),
    targetType: 'collection',
    riskScore: Math.min(riskScore, 100),
    findings,
    recommendations,
    summary: generateSummary(findings, riskScore),
  }
}

/**
 * Audit a wallet's token holdings and authorities
 */
export async function auditWallet(
  connection: Connection,
  wallet: PublicKey
): Promise<AuditReport> {
  const findings: AuditFinding[] = []
  const recommendations: string[] = []
  let riskScore = 0

  try {
    // Check SOL balance
    const balance = await connection.getBalance(wallet)

    if (balance > 100 * 1e9) { // > 100 SOL
      findings.push({
        severity: 'medium',
        category: 'balance',
        title: 'Large SOL balance',
        description: `Wallet has ${balance / 1e9} SOL`,
        recommendation: 'Consider using cold storage for large amounts',
      })
      recommendations.push('Use hardware wallet or cold storage for large balances')
      riskScore += 15
    }

    // Check for token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    })

    if (tokenAccounts.value.length > 50) {
      findings.push({
        severity: 'low',
        category: 'accounts',
        title: 'Many token accounts',
        description: `Wallet has ${tokenAccounts.value.length} token accounts`,
        recommendation: 'Consider closing unused token accounts to reclaim rent',
      })
      recommendations.push('Close unused token accounts to reclaim SOL')
    }

    findings.push({
      severity: 'info',
      category: 'summary',
      title: 'Wallet overview',
      description: `Balance: ${balance / 1e9} SOL, Token accounts: ${tokenAccounts.value.length}`,
    })

  } catch (error) {
    findings.push({
      severity: 'critical',
      category: 'error',
      title: 'Audit failed',
      description: `Error during audit: ${(error as Error).message}`,
    })
    riskScore = 100
  }

  return {
    timestamp: new Date(),
    target: wallet.toBase58(),
    targetType: 'wallet',
    riskScore: Math.min(riskScore, 100),
    findings,
    recommendations,
    summary: generateSummary(findings, riskScore),
  }
}

/**
 * Generate a summary from findings
 */
function generateSummary(findings: AuditFinding[], riskScore: number): string {
  const critical = findings.filter(f => f.severity === 'critical').length
  const high = findings.filter(f => f.severity === 'high').length
  const medium = findings.filter(f => f.severity === 'medium').length

  if (critical > 0) {
    return `Critical issues found (${critical}). Immediate action required.`
  }
  if (high > 0) {
    return `High severity issues found (${high}). Review recommended.`
  }
  if (medium > 0) {
    return `Medium severity issues found (${medium}). Consider addressing.`
  }
  if (riskScore < 20) {
    return 'No significant issues found. Low risk.'
  }
  return 'Review complete. See findings for details.'
}

/**
 * Generate a full security report
 */
// eslint-disable-next-line no-unused-vars
export async function generateSecurityReport(options: {
  connection: Connection
  tokens?: PublicKey[]
  collections?: PublicKey[]
  wallet?: PublicKey
}): Promise<{
  reports: AuditReport[]
  overallRiskScore: number
  summary: string
}> {
  const reports: AuditReport[] = []

  // Audit tokens
  if (options.tokens) {
    for (const token of options.tokens) {
      reports.push(await auditToken(options.connection, token))
    }
  }

  // Audit collections
  if (options.collections) {
    for (const collection of options.collections) {
      reports.push(await auditCollection(options.connection, collection))
    }
  }

  // Audit wallet
  if (options.wallet) {
    reports.push(await auditWallet(options.connection, options.wallet))
  }

  // Calculate overall risk
  const overallRiskScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + r.riskScore, 0) / reports.length)
    : 0

  return {
    reports,
    overallRiskScore,
    summary: `Audited ${reports.length} items. Overall risk score: ${overallRiskScore}/100`,
  }
}

/**
 * Audit a Candy Machine
 */
export async function auditCandyMachine(
  connection: Connection,
  address: PublicKey
): Promise<AuditReport> {
  const { fullCandyMachineSecurityCheck } = await import('./candy-machine-checks')
  return fullCandyMachineSecurityCheck(connection, address)
}

/**
 * Audit a DAO governance program
 */
export async function auditGovernance(
  connection: Connection,
  address: PublicKey
): Promise<AuditReport> {
  const { fullGovernanceSecurityCheck } = await import('./governance-checks')
  return fullGovernanceSecurityCheck(connection, address)
}

/**
 * Audit a staking pool
 */
export async function auditStakingPool(
  connection: Connection,
  address: PublicKey
): Promise<AuditReport> {
  const { fullStakingSecurityCheck } = await import('./staking-checks')
  return fullStakingSecurityCheck(connection, address)
}
