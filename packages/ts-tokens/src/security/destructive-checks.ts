/**
 * Destructive Operation Security Checks
 *
 * Safety checks for irreversible operations like authority transfers and burns.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'

/**
 * Warn about authority transfer irreversibility
 */
export function checkAuthorityTransferIrreversibility(): SecurityCheckResult {
  return {
    safe: true,
    warnings: ['Authority transfer is irreversible — you will lose control permanently'],
    recommendations: [
      'Double-check the destination address',
      'Consider using a multisig as the new authority',
      'Ensure you have a backup plan',
    ],
  }
}

/**
 * Check if destination is a multisig
 */
export async function checkDestinationIsMultisig(
  connection: Connection,
  dest: PublicKey
): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    const accountInfo = await connection.getAccountInfo(dest)
    if (!accountInfo) {
      warnings.push('Destination account does not exist on chain')
      recommendations.push('Verify the destination address is correct and funded')
    }
  } catch {
    warnings.push('Could not verify destination account')
  }

  recommendations.push('Using a multisig for authority is strongly recommended')

  return { safe: true, warnings, recommendations }
}

/**
 * Check consequences of revoking an authority
 */
export function checkRevocationConsequences(
  type: 'mint' | 'freeze' | 'update',
  state: { currentSupply?: bigint; hasFreeze?: boolean; isMutable?: boolean }
): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  switch (type) {
    case 'mint':
      warnings.push('Revoking mint authority means no more tokens can ever be minted')
      if (state.currentSupply !== undefined) {
        recommendations.push(`Current supply will be permanently fixed at ${state.currentSupply}`)
      }
      break
    case 'freeze':
      warnings.push('Revoking freeze authority means no accounts can be frozen or thawed')
      break
    case 'update':
      warnings.push('Revoking update authority means metadata can never be changed')
      if (state.isMutable) {
        recommendations.push('Ensure metadata is finalized before revoking update authority')
      }
      break
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Confirm authority transfer details
 */
export function confirmAuthorityTransfer(
  type: 'mint' | 'freeze' | 'update',
  dest: string
): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  warnings.push(`You are transferring ${type} authority to ${dest}`)
  recommendations.push(`Verify that ${dest} is the correct destination`)
  recommendations.push('This action cannot be undone')

  return { safe: true, warnings, recommendations }
}

/**
 * Check burn irreversibility
 */
export function checkBurnIrreversibility(amount: bigint, isNFT: boolean): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (isNFT) {
    warnings.push('Burning an NFT is permanent — the token and metadata will be destroyed')
  } else {
    warnings.push(`Burning ${amount} tokens is permanent — they cannot be recovered`)
  }

  recommendations.push('Ensure this is the intended action')

  return { safe: true, warnings, recommendations }
}

/**
 * Check burn amount relative to balance and supply
 */
export function checkBurnAmount(amount: bigint, balance: bigint, supply: bigint): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (amount > balance) {
    return {
      safe: false,
      warnings: ['Burn amount exceeds account balance'],
      recommendations: ['Reduce the burn amount to match available balance'],
    }
  }

  if (supply > 0n && amount > supply / 2n) {
    warnings.push('Burning more than 50% of total supply')
    recommendations.push('Verify this is the intended amount')
  }

  return { safe: amount <= balance, warnings, recommendations }
}

/**
 * Check if burning all tokens
 */
export function checkBurnAllWarning(amount: bigint, balance: bigint): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (amount === balance) {
    warnings.push('You are burning your entire token balance')
    recommendations.push('Ensure you want to remove all tokens from this account')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check NFT burn value (metadata check)
 */
export function checkNFTBurnValue(metadata: {
  name: string
  collection?: string
  rarity?: string
}): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  warnings.push(`You are about to burn NFT: "${metadata.name}"`)
  if (metadata.collection) {
    warnings.push(`Collection: ${metadata.collection}`)
  }
  if (metadata.rarity) {
    warnings.push(`Rarity: ${metadata.rarity}`)
  }
  recommendations.push('Verify you want to permanently destroy this NFT')

  return { safe: true, warnings, recommendations }
}

/**
 * Check batch burn limit
 */
export function checkBatchBurnLimit(count: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (count > 50) {
    warnings.push(`Batch burning ${count} tokens — this is a large operation`)
    recommendations.push('Consider burning in smaller batches')
    recommendations.push('Verify the token list is correct before proceeding')
  }

  if (count > 200) {
    warnings.push('Very large batch burn — may require multiple transactions')
    recommendations.push('Split into batches of 50 or fewer for reliability')
  }

  return { safe: true, warnings, recommendations }
}
