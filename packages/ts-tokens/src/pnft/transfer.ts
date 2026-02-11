/**
 * Programmable NFT Transfers
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type {
  ProgrammableNFT,
  TransferRule,
  TransferValidation,
  PNFTTransferOptions,
} from './types'
import { getPNFT } from './create'
import { getAllRules } from './rules'

/**
 * Validate if transfer is allowed
 */
export async function canTransfer(
  connection: Connection,
  mint: PublicKey,
  from: PublicKey,
  to: PublicKey
): Promise<TransferValidation> {
  const pnft = await getPNFT(connection, mint)

  if (!pnft) {
    return { allowed: true, failedRules: [] }
  }

  const rules = await getAllRules(connection, mint)
  const failedRules: TransferValidation['failedRules'] = []
  let royaltyAmount: bigint | undefined

  for (const rule of rules) {
    if (!rule.enabled) continue

    const result = await validateRule(connection, rule, pnft, from, to)
    if (!result.allowed) {
      failedRules.push(rule.type)
    }
    if (rule.type === 'royalty_enforcement') {
      royaltyAmount = result.royaltyAmount
    }
  }

  if (failedRules.length > 0) {
    return {
      allowed: false,
      reason: getFailureReason(failedRules, pnft),
      failedRules,
      royaltyAmount,
    }
  }

  return { allowed: true, failedRules: [], royaltyAmount }
}

/**
 * Validate a single rule
 */
async function validateRule(
  connection: Connection,
  rule: TransferRule,
  pnft: ProgrammableNFT,
  from: PublicKey,
  to: PublicKey
): Promise<{ allowed: boolean; royaltyAmount?: bigint }> {
  switch (rule.type) {
    case 'soulbound':
      return { allowed: false }

    case 'allow_list':
      return {
        allowed: rule.addresses.some(a => a.equals(to)),
      }

    case 'deny_list':
      return {
        allowed: !rule.addresses.some(a => a.equals(to)),
      }

    case 'cooldown_period': {
      const now = Math.floor(Date.now() / 1000)
      const elapsed = now - pnft.lastTransfer
      return { allowed: elapsed >= rule.periodSeconds }
    }

    case 'max_transfers':
      return { allowed: pnft.transferCount < rule.maxTransfers }

    case 'holder_gate': {
      // Would check if recipient holds required token
      return { allowed: true }
    }

    case 'royalty_enforcement':
      // Royalty is always "allowed" but requires payment
      return { allowed: true, royaltyAmount: 0n } // Would calculate actual amount

    case 'program_gate':
      // Would check transaction includes required program
      return { allowed: true }

    case 'creator_approval':
      // Would check for creator signature
      return { allowed: true }

    default:
      return { allowed: true }
  }
}

/**
 * Get human-readable failure reason
 */
function getFailureReason(
  failedRules: TransferValidation['failedRules'],
  pnft: ProgrammableNFT
): string {
  const reasons: string[] = []

  for (const ruleType of failedRules) {
    switch (ruleType) {
      case 'soulbound':
        reasons.push('NFT is soulbound and cannot be transferred')
        break
      case 'allow_list':
        reasons.push('Recipient is not on the allow list')
        break
      case 'deny_list':
        reasons.push('Recipient is on the deny list')
        break
      case 'cooldown_period': {
        const rule = pnft.rules.find(r => r.type === 'cooldown_period')
        if (rule && rule.type === 'cooldown_period') {
          const now = Math.floor(Date.now() / 1000)
          const remaining = rule.periodSeconds - (now - pnft.lastTransfer)
          reasons.push(`Cooldown period active (${formatDuration(remaining)} remaining)`)
        }
        break
      }
      case 'max_transfers': {
        const rule = pnft.rules.find(r => r.type === 'max_transfers')
        if (rule && rule.type === 'max_transfers') {
          reasons.push(`Maximum transfers reached (${pnft.transferCount}/${rule.maxTransfers})`)
        }
        break
      }
      case 'holder_gate':
        reasons.push('Recipient does not hold required token')
        break
      case 'creator_approval':
        reasons.push('Creator approval required')
        break
      default:
        reasons.push(`Transfer blocked by ${ruleType} rule`)
    }
  }

  return reasons.join('; ')
}

/**
 * Format duration in seconds to human readable
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

/**
 * Transfer programmable NFT
 */
export async function transferPNFT(
  connection: Connection,
  options: PNFTTransferOptions
): Promise<{ signature: string; royaltyPaid?: bigint }> {
  const { mint, from, to, payRoyalty = true } = options

  // Validate transfer
  const validation = await canTransfer(connection, mint, from, to)

  if (!validation.allowed) {
    throw new Error(`Transfer not allowed: ${validation.reason}`)
  }

  // In production, would:
  // 1. Build transfer instruction
  // 2. Add royalty payment if required
  // 3. Update pNFT state (lastTransfer, transferCount)
  // 4. Execute transaction

  return {
    signature: `pnft_transferred_${Date.now()}`,
    royaltyPaid: validation.royaltyAmount,
  }
}

/**
 * Delegate transfer authority
 */
export async function delegateTransfer(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  delegate: PublicKey
): Promise<string> {
  // In production, would set delegate on pNFT account
  return `delegate_set_${Date.now()}`
}

/**
 * Revoke transfer delegation
 */
export async function revokeDelegate(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey
): Promise<string> {
  // In production, would clear delegate on pNFT account
  return `delegate_revoked_${Date.now()}`
}

/**
 * Get transfer history for pNFT
 */
export async function getTransferHistory(
  connection: Connection,
  mint: PublicKey,
  limit: number = 20
): Promise<Array<{
  from: PublicKey
  to: PublicKey
  timestamp: number
  signature: string
  royaltyPaid?: bigint
}>> {
  // In production, would fetch transfer history
  return []
}

/**
 * Estimate royalty for transfer
 */
export async function estimateRoyalty(
  connection: Connection,
  mint: PublicKey,
  salePrice: bigint
): Promise<{ amount: bigint; recipients: Array<{ address: PublicKey; amount: bigint }> }> {
  const pnft = await getPNFT(connection, mint)

  if (!pnft) {
    return { amount: 0n, recipients: [] }
  }

  const royaltyRule = pnft.rules.find(r => r.type === 'royalty_enforcement')
  if (!royaltyRule || royaltyRule.type !== 'royalty_enforcement') {
    return { amount: 0n, recipients: [] }
  }

  const totalRoyalty = (salePrice * BigInt(royaltyRule.royaltyBps)) / 10000n

  const recipients = royaltyRule.recipients.map(r => ({
    address: r.address,
    amount: (totalRoyalty * BigInt(r.share)) / 100n,
  }))

  return { amount: totalRoyalty, recipients }
}
