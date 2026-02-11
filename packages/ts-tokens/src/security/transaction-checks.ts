/**
 * Transaction Security Checks
 *
 * Pre-flight security validation for transactions.
 */

import type { Connection, VersionedTransaction } from '@solana/web3.js'
import { PublicKey, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'

/**
 * Check if address is valid
 */
export function checkAddressValid(address: string): SecurityCheckResult {
  try {
    new PublicKey(address)
    return { safe: true, warnings: [], recommendations: [] }
  } catch {
    return {
      safe: false,
      warnings: ['Invalid Solana address format'],
      recommendations: ['Verify the address is a valid base58-encoded public key'],
    }
  }
}

/**
 * Check if sending to an exchange without memo
 */
export function checkExchangeWithoutMemo(address: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Known exchange deposit addresses often require memos
  // This is a heuristic check
  const KNOWN_EXCHANGE_PREFIXES = ['FTX', 'Binance', 'Coinbase']
  // In production, check against a database
  recommendations.push('If sending to an exchange, ensure a memo is included if required')

  return { safe: true, warnings, recommendations }
}

/**
 * Check if address has no prior on-chain activity
 */
export async function checkNewAddress(connection: Connection, address: string): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    const pubkey = new PublicKey(address)
    const accountInfo = await connection.getAccountInfo(pubkey)
    if (!accountInfo) {
      warnings.push('Destination address has no on-chain activity')
      recommendations.push('Verify the address is correct — sending to an unused address may be a mistake')
    }
  } catch {
    warnings.push('Could not verify destination address')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check transaction amount for decimal errors
 */
export function checkTransactionAmount(amount: bigint, decimals: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const uiAmount = Number(amount) / Math.pow(10, decimals)

  if (uiAmount > 1_000_000_000) {
    warnings.push(`Very large amount: ${uiAmount.toLocaleString()}`)
    recommendations.push('Double-check the decimal places to prevent errors')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check if payer has enough balance for fees
 */
export async function checkBalanceForFees(
  connection: Connection,
  payer: PublicKey,
  estimatedFee: number
): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    const balance = await connection.getBalance(payer)
    if (balance < estimatedFee) {
      return {
        safe: false,
        warnings: [`Insufficient balance for fees: need ${estimatedFee / LAMPORTS_PER_SOL} SOL, have ${balance / LAMPORTS_PER_SOL} SOL`],
        recommendations: ['Add more SOL to cover transaction fees'],
      }
    }

    if (balance - estimatedFee < 0.001 * LAMPORTS_PER_SOL) {
      warnings.push('Balance will be very low after fees')
      recommendations.push('Consider keeping a minimum balance for future transactions')
    }
  } catch {
    warnings.push('Could not check payer balance')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check decimal handling
 */
export function checkDecimalHandling(amount: bigint, decimals: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const divisor = BigInt(Math.pow(10, decimals))
  if (amount > 0n && amount < divisor) {
    warnings.push('Amount is less than 1 full token unit — fractional transfer')
    recommendations.push('Verify this is the intended amount')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check signer has required authority
 */
export function checkSignerAuthority(signer: string, requiredAuth: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (signer !== requiredAuth) {
    return {
      safe: false,
      warnings: ['Signer does not match required authority'],
      recommendations: ['Use the correct authority keypair for this operation'],
    }
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check delegate expiration
 */
export function checkDelegateExpiration(delegateInfo: { expiresAt?: number }): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (delegateInfo.expiresAt) {
    const now = Date.now() / 1000
    if (delegateInfo.expiresAt < now) {
      return {
        safe: false,
        warnings: ['Delegate has expired'],
        recommendations: ['Re-delegate to perform this operation'],
      }
    }
    const remainingHours = (delegateInfo.expiresAt - now) / 3600
    if (remainingHours < 1) {
      warnings.push('Delegate expires in less than 1 hour')
      recommendations.push('Consider re-delegating with a longer expiration')
    }
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Simulate transaction before sending
 */
export async function checkSimulationBeforeSend(
  connection: Connection,
  tx: Transaction | VersionedTransaction
): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    const result = await connection.simulateTransaction(tx as VersionedTransaction, { sigVerify: false })
    if (result.value.err) {
      return {
        safe: false,
        warnings: [`Simulation failed: ${JSON.stringify(result.value.err)}`],
        recommendations: ['Fix the transaction errors before sending'],
      }
    }
    if (result.value.unitsConsumed && result.value.unitsConsumed > 1_000_000) {
      warnings.push(`High compute usage: ${result.value.unitsConsumed} units`)
      recommendations.push('Consider optimizing the transaction or increasing compute budget')
    }
  } catch (error) {
    warnings.push(`Simulation error: ${(error as Error).message}`)
    recommendations.push('Transaction may fail — consider verifying inputs')
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check simulation result for errors
 */
export function checkSimulationErrors(result: { success: boolean; error?: string; logs?: string[] }): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (!result.success) {
    warnings.push(`Simulation failed: ${result.error ?? 'unknown error'}`)
    recommendations.push('Review the error and fix before sending')
  }

  if (result.logs) {
    for (const log of result.logs) {
      if (log.toLowerCase().includes('error') || log.includes('failed')) {
        warnings.push(`Error in logs: ${log}`)
      }
    }
  }

  return { safe: result.success, warnings, recommendations }
}

/**
 * Check expected account changes from simulation
 */
export function checkExpectedAccountChanges(result: {
  accountChanges?: Array<{ address: string; before: { lamports: bigint }; after: { lamports: bigint } }>
}): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (!result.accountChanges) {
    return { safe: true, warnings, recommendations }
  }

  for (const change of result.accountChanges) {
    const diff = change.after.lamports - change.before.lamports
    if (diff < 0n) {
      const solDiff = Number(-diff) / LAMPORTS_PER_SOL
      if (solDiff > 10) {
        warnings.push(`Account ${change.address} will lose ${solDiff.toFixed(4)} SOL`)
        recommendations.push('Verify the expected balance changes')
      }
    }
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Full transaction security check
 */
export async function fullTransactionSecurityCheck(
  connection: Connection,
  tx: Transaction | VersionedTransaction,
  wallet: PublicKey
): Promise<SecurityCheckResult> {
  const allWarnings: string[] = []
  const allRecommendations: string[] = []

  const feeCheck = await checkBalanceForFees(connection, wallet, 5000)
  allWarnings.push(...feeCheck.warnings)
  allRecommendations.push(...feeCheck.recommendations)

  const simCheck = await checkSimulationBeforeSend(connection, tx)
  allWarnings.push(...simCheck.warnings)
  allRecommendations.push(...simCheck.recommendations)

  return {
    safe: feeCheck.safe && simCheck.safe,
    warnings: allWarnings,
    recommendations: allRecommendations,
  }
}
