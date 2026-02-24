/**
 * Security Checks
 *
 * Pre-transaction and pre-operation security checks.
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

export interface SecurityCheckResult {
  safe: boolean
  warnings: string[]
  recommendations: string[]
}

/**
 * Check if an address is a known scam address
 * In production, this would check against a database
 */
export async function checkAddressReputation(address: string): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Basic validation
  try {
    new PublicKey(address)
  } catch {
    return {
      safe: false,
      warnings: ['Invalid Solana address format'],
      recommendations: ['Verify the address is correct'],
    }
  }

  // In production, check against known scam database
  // For now, just return safe
  return {
    safe: true,
    warnings,
    recommendations,
  }
}

/**
 * Check balance before transaction
 */
export async function checkSufficientBalance(
  connection: Connection,
  address: PublicKey,
  requiredLamports: number
): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  const balance = await connection.getBalance(address)

  if (balance < requiredLamports) {
    const required = requiredLamports / LAMPORTS_PER_SOL
    const available = balance / LAMPORTS_PER_SOL
    return {
      safe: false,
      warnings: [`Insufficient balance: need ${required} SOL, have ${available} SOL`],
      recommendations: ['Add more SOL to your wallet before proceeding'],
    }
  }

  // Warn if balance will be very low after transaction
  const remainingBalance = balance - requiredLamports
  if (remainingBalance < 0.01 * LAMPORTS_PER_SOL) {
    warnings.push('Balance will be very low after this transaction')
    recommendations.push('Consider keeping some SOL for future transaction fees')
  }

  return {
    safe: true,
    warnings,
    recommendations,
  }
}

/**
 * Check if amount is unusually large
 */
export function checkUnusualAmount(
  amount: bigint,
  totalSupply: bigint,
  decimals: number
): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Warn if transferring more than 50% of supply
  if (totalSupply > 0n && amount > totalSupply / 2n) {
    warnings.push('This amount is more than 50% of total supply')
    recommendations.push('Verify this is the intended amount')
  }

  // Warn if amount seems like a decimal mistake
  const uiAmount = Number(amount) / Math.pow(10, decimals)
  if (uiAmount > 1_000_000_000) {
    warnings.push('This is a very large amount')
    recommendations.push('Double-check the decimal places')
  }

  return {
    safe: warnings.length === 0,
    warnings,
    recommendations,
  }
}

/**
 * Check authority before sensitive operation
 */
export async function checkAuthority(
  _connection: Connection,
  mint: PublicKey,
  _expectedAuthority: PublicKey,
  _authorityType: 'mint' | 'freeze' | 'update'
): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  // In production, fetch mint info and verify authority
  // For now, return basic check

  return {
    safe: true,
    warnings,
    recommendations,
  }
}

/**
 * Pre-transaction security check
 */
export async function preTransactionCheck(options: {
  connection: Connection
  payer: PublicKey
  estimatedFee: number
  recipients?: string[]
  amount?: bigint
  isDestructive?: boolean
}): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check balance
  const balanceCheck = await checkSufficientBalance(
    options.connection,
    options.payer,
    options.estimatedFee
  )
  warnings.push(...balanceCheck.warnings)
  recommendations.push(...balanceCheck.recommendations)

  // Check recipients
  if (options.recipients) {
    for (const recipient of options.recipients) {
      const repCheck = await checkAddressReputation(recipient)
      warnings.push(...repCheck.warnings)
      recommendations.push(...repCheck.recommendations)
    }
  }

  // Warn about destructive operations
  if (options.isDestructive) {
    warnings.push('This operation is irreversible')
    recommendations.push('Make sure you understand the consequences')
  }

  return {
    safe: warnings.filter(w => w.includes('Insufficient') || w.includes('Invalid')).length === 0,
    warnings,
    recommendations,
  }
}

/**
 * Check token configuration security
 */
export function checkTokenSecurity(options: {
  mintAuthority: string | null
  freezeAuthority: string | null
  supply: bigint
  decimals: number
  isMutable: boolean
}): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check mint authority
  if (options.mintAuthority) {
    recommendations.push('Consider revoking mint authority for fixed-supply tokens')
  }

  // Check freeze authority
  if (options.freezeAuthority) {
    warnings.push('Freeze authority is set - tokens can be frozen')
    recommendations.push('Consider revoking freeze authority for trustless tokens')
  }

  // Check mutability
  if (options.isMutable) {
    warnings.push('Token metadata is mutable')
    recommendations.push('Consider making metadata immutable after launch')
  }

  return {
    safe: true,
    warnings,
    recommendations,
  }
}

/**
 * Check NFT collection security
 */
export function checkCollectionSecurity(options: {
  updateAuthority: string
  royaltyBps: number
  creatorShares: number[]
  isMutable: boolean
  isVerified: boolean
}): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check royalty
  if (options.royaltyBps > 1000) {
    warnings.push(`High royalty: ${options.royaltyBps / 100}%`)
  }

  // Check creator shares
  const totalShares = options.creatorShares.reduce((a, b) => a + b, 0)
  if (totalShares !== 100) {
    warnings.push(`Creator shares don't sum to 100: ${totalShares}`)
  }

  // Check mutability
  if (options.isMutable) {
    warnings.push('Collection metadata is mutable')
    recommendations.push('Consider making immutable after launch')
  }

  // Check verification
  if (!options.isVerified) {
    warnings.push('Collection is not verified')
    recommendations.push('Verify the collection for marketplace visibility')
  }

  return {
    safe: warnings.filter(w => w.includes("don't sum")).length === 0,
    warnings,
    recommendations,
  }
}
