/**
 * Programmable NFT Rules
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  TransferRule,
  TransferRuleType,
  ProgrammableNFT,
  RoyaltyEnforcementRule,
  AllowListRule,
  DenyListRule,
  CooldownPeriodRule,
  MaxTransfersRule,
  HolderGateRule,
  PNFTResult,
} from './types'
import { pnftNotImplemented } from './program'

/**
 * Add rule to pNFT
 */
export async function addRule(
  _rule: TransferRule,
  _mint: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('addRule')
}

/**
 * Remove rule from pNFT
 */
export async function removeRule(
  _ruleType: TransferRuleType,
  _mint: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('removeRule')
}

/**
 * Update rule on pNFT
 */
export async function updateRule(
  _rule: TransferRule,
  _mint: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('updateRule')
}

/**
 * Enable/disable rule
 */
export async function setRuleEnabled(
  _ruleType: TransferRuleType,
  _enabled: boolean,
  _mint: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('setRuleEnabled')
}

/**
 * Freeze rules (make immutable)
 */
export async function freezeRules(
  _mint: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('freezeRules')
}

/**
 * Add rule to rule set
 */
export async function addRuleToSet(
  _rule: TransferRule,
  _ruleSet: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('addRuleToSet')
}

/**
 * Remove rule from rule set
 */
export async function removeRuleFromSet(
  _ruleType: TransferRuleType,
  _ruleSet: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('removeRuleFromSet')
}

/**
 * Get all rules for pNFT (including inherited from rule set)
 */
export async function getAllRules(
  _connection: Connection,
  _mint: PublicKey
): Promise<TransferRule[]> {
  pnftNotImplemented('getAllRules')
}

/**
 * Check if pNFT has specific rule
 */
export function hasRule(pnft: ProgrammableNFT, ruleType: TransferRuleType): boolean {
  return pnft.rules.some(r => r.type === ruleType && r.enabled)
}

/**
 * Get specific rule from pNFT
 */
export function getRule<T extends TransferRule>(
  pnft: ProgrammableNFT,
  ruleType: T['type']
): T | undefined {
  return pnft.rules.find(r => r.type === ruleType) as T | undefined
}

// Rule builders

/**
 * Create royalty enforcement rule
 */
export function createRoyaltyRule(
  royaltyBps: number,
  recipients: Array<{ address: PublicKey; share: number }>
): RoyaltyEnforcementRule {
  return {
    type: 'royalty_enforcement',
    enabled: true,
    royaltyBps,
    recipients,
  }
}

/**
 * Create allow list rule
 */
export function createAllowListRule(addresses: PublicKey[]): AllowListRule {
  return {
    type: 'allow_list',
    enabled: true,
    addresses,
  }
}

/**
 * Create deny list rule
 */
export function createDenyListRule(addresses: PublicKey[]): DenyListRule {
  return {
    type: 'deny_list',
    enabled: true,
    addresses,
  }
}

/**
 * Create cooldown rule
 */
export function createCooldownRule(periodSeconds: number): CooldownPeriodRule {
  return {
    type: 'cooldown_period',
    enabled: true,
    periodSeconds,
  }
}

/**
 * Create max transfers rule
 */
export function createMaxTransfersRule(maxTransfers: number): MaxTransfersRule {
  return {
    type: 'max_transfers',
    enabled: true,
    maxTransfers,
  }
}

/**
 * Create holder gate rule
 */
export function createHolderGateRule(
  requiredToken: PublicKey,
  minAmount: bigint
): HolderGateRule {
  return {
    type: 'holder_gate',
    enabled: true,
    requiredToken,
    minAmount,
  }
}

/**
 * Validate rule configuration
 */
export function validateRule(rule: TransferRule): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  switch (rule.type) {
    case 'royalty_enforcement':
      if (rule.royaltyBps < 0 || rule.royaltyBps > 10000) {
        errors.push('Royalty must be between 0 and 10000 bps')
      }
      const totalShare = rule.recipients.reduce((sum, r) => sum + r.share, 0)
      if (totalShare !== 100) {
        errors.push('Recipient shares must sum to 100')
      }
      break

    case 'cooldown_period':
      if (rule.periodSeconds <= 0) {
        errors.push('Cooldown period must be positive')
      }
      break

    case 'max_transfers':
      if (rule.maxTransfers <= 0) {
        errors.push('Max transfers must be positive')
      }
      break

    case 'allow_list':
    case 'deny_list':
      if (rule.addresses.length === 0) {
        errors.push('Address list cannot be empty')
      }
      break
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Format rules for display
 */
export function formatRules(rules: TransferRule[]): string {
  return rules.map(rule => {
    const status = rule.enabled ? '\u2713' : '\u2717'
    switch (rule.type) {
      case 'royalty_enforcement':
        return `${status} Royalty: ${rule.royaltyBps / 100}%`
      case 'allow_list':
        return `${status} Allow List: ${rule.addresses.length} addresses`
      case 'deny_list':
        return `${status} Deny List: ${rule.addresses.length} addresses`
      case 'cooldown_period':
        return `${status} Cooldown: ${rule.periodSeconds}s`
      case 'max_transfers':
        return `${status} Max Transfers: ${rule.maxTransfers}`
      case 'soulbound':
        return `${status} Soulbound`
      default:
        return `${status} ${rule.type}`
    }
  }).join('\n')
}
