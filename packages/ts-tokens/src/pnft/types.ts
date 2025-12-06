/**
 * Programmable NFT Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Transfer rule types
 */
export type TransferRuleType
  = | 'royalty_enforcement'
    | 'allow_list'
    | 'deny_list'
    | 'program_gate'
    | 'holder_gate'
    | 'creator_approval'
    | 'cooldown_period'
    | 'max_transfers'
    | 'soulbound'
    | 'custom'

/**
 * Base transfer rule
 */
export interface TransferRuleBase {
  type: TransferRuleType
  enabled: boolean
}

/**
 * Royalty enforcement rule
 */
export interface RoyaltyEnforcementRule extends TransferRuleBase {
  type: 'royalty_enforcement'
  royaltyBps: number
  recipients: Array<{ address: PublicKey, share: number }>
}

/**
 * Allow list rule
 */
export interface AllowListRule extends TransferRuleBase {
  type: 'allow_list'
  addresses: PublicKey[]
}

/**
 * Deny list rule
 */
export interface DenyListRule extends TransferRuleBase {
  type: 'deny_list'
  addresses: PublicKey[]
}

/**
 * Program gate rule
 */
export interface ProgramGateRule extends TransferRuleBase {
  type: 'program_gate'
  programs: PublicKey[]
}

/**
 * Holder gate rule
 */
export interface HolderGateRule extends TransferRuleBase {
  type: 'holder_gate'
  requiredToken: PublicKey
  minAmount: bigint
}

/**
 * Creator approval rule
 */
export interface CreatorApprovalRule extends TransferRuleBase {
  type: 'creator_approval'
  creator: PublicKey
}

/**
 * Cooldown period rule
 */
export interface CooldownPeriodRule extends TransferRuleBase {
  type: 'cooldown_period'
  periodSeconds: number
}

/**
 * Max transfers rule
 */
export interface MaxTransfersRule extends TransferRuleBase {
  type: 'max_transfers'
  maxTransfers: number
}

/**
 * Soulbound rule (non-transferable)
 */
export interface SoulboundRule extends TransferRuleBase {
  type: 'soulbound'
  recoveryAuthority?: PublicKey
}

/**
 * Custom rule
 */
export interface CustomRule extends TransferRuleBase {
  type: 'custom'
  program: PublicKey
  data: Uint8Array
}

/**
 * Union of all transfer rules
 */
export type TransferRule
  = | RoyaltyEnforcementRule
    | AllowListRule
    | DenyListRule
    | ProgramGateRule
    | HolderGateRule
    | CreatorApprovalRule
    | CooldownPeriodRule
    | MaxTransfersRule
    | SoulboundRule
    | CustomRule

/**
 * NFT state
 */
export type PNFTState = 'unlocked' | 'listed' | 'staked' | 'frozen'

/**
 * Programmable NFT account
 */
export interface ProgrammableNFT {
  mint: PublicKey
  owner: PublicKey
  rules: TransferRule[]
  ruleSet?: PublicKey
  delegate?: PublicKey
  state: PNFTState
  lastTransfer: number
  transferCount: number
  metadata: {
    name: string
    symbol: string
    uri: string
  }
}

/**
 * Rule set account (collection-level rules)
 */
export interface RuleSet {
  address: PublicKey
  authority: PublicKey
  rules: TransferRule[]
  isMutable: boolean
}

/**
 * Create pNFT options
 */
export interface CreatePNFTOptions {
  name: string
  symbol: string
  uri: string
  rules?: TransferRule[]
  ruleSet?: PublicKey
  collection?: PublicKey
}

/**
 * Create rule set options
 */
export interface CreateRuleSetOptions {
  collection?: PublicKey
  rules: TransferRule[]
  isMutable?: boolean
}

/**
 * Transfer validation result
 */
export interface TransferValidation {
  allowed: boolean
  reason?: string
  failedRules: TransferRuleType[]
  royaltyAmount?: bigint
}

/**
 * Transfer options
 */
export interface PNFTTransferOptions {
  mint: PublicKey
  from: PublicKey
  to: PublicKey
  payRoyalty?: boolean
  creatorSignature?: Uint8Array
}
