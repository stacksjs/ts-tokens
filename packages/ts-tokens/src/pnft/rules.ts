/**
 * Programmable NFT Rules
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type {
  AllowListRule,
  CooldownPeriodRule,
  DenyListRule,
  HolderGateRule,
  MaxTransfersRule,
  ProgrammableNFT,
  RoyaltyEnforcementRule,
  TransferRule,
  TransferRuleType,
} from './types'

/**
 * Add rule to pNFT
 */
export async function addRule(
  connection: Connection,
  mint: PublicKey,
  authority: PublicKey,
  rule: TransferRule,
): Promise<string> {
  // In production, would add rule to pNFT account
  return `rule_added_${rule.type}_${Date.now()}`
}

/**
 * Remove rule from pNFT
 */
export async function removeRule(
  connection: Connection,
  mint: PublicKey,
  authority: PublicKey,
  ruleType: TransferRuleType,
): Promise<string> {
  // In production, would remove rule from pNFT account
  return `rule_removed_${ruleType}_${Date.now()}`
}

/**
 * Update rule on pNFT
 */
export async function updateRule(
  connection: Connection,
  mint: PublicKey,
  authority: PublicKey,
  rule: TransferRule,
): Promise<string> {
  // In production, would update existing rule
  return `rule_updated_${rule.type}_${Date.now()}`
}

/**
 * Enable/disable rule
 */
export async function setRuleEnabled(
  connection: Connection,
  mint: PublicKey,
  authority: PublicKey,
  ruleType: TransferRuleType,
  enabled: boolean,
): Promise<string> {
  return `rule_${enabled ? 'enabled' : 'disabled'}_${ruleType}_${Date.now()}`
}

/**
 * Freeze rules (make immutable)
 */
export async function freezeRules(
  connection: Connection,
  mint: PublicKey,
  authority: PublicKey,
): Promise<string> {
  // In production, would make rules immutable
  return `rules_frozen_${Date.now()}`
}

/**
 * Add rule to rule set
 */
export async function addRuleToSet(
  connection: Connection,
  ruleSet: PublicKey,
  authority: PublicKey,
  rule: TransferRule,
): Promise<string> {
  return `ruleset_rule_added_${rule.type}_${Date.now()}`
}

/**
 * Remove rule from rule set
 */
export async function removeRuleFromSet(
  connection: Connection,
  ruleSet: PublicKey,
  authority: PublicKey,
  ruleType: TransferRuleType,
): Promise<string> {
  return `ruleset_rule_removed_${ruleType}_${Date.now()}`
}

/**
 * Get all rules for pNFT (including inherited from rule set)
 */
export async function getAllRules(
  connection: Connection,
  mint: PublicKey,
): Promise<TransferRule[]> {
  // In production, would fetch pNFT rules + rule set rules
  return []
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
  ruleType: T['type'],
): T | undefined {
  return pnft.rules.find(r => r.type === ruleType) as T | undefined
}

// Rule builders

/**
 * Create royalty enforcement rule
 */
export function createRoyaltyRule(
  royaltyBps: number,
  recipients: Array<{ address: PublicKey, share: number }>,
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
  minAmount: bigint,
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
export function validateRule(rule: TransferRule): { valid: boolean, errors: string[] } {
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
  return rules.map((rule) => {
    const status = rule.enabled ? '✓' : '✗'
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
