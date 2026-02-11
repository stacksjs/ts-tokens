/**
 * Token-2022 Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Extension types available in Token-2022
 */
export enum ExtensionType {
  Uninitialized = 0,
  TransferFeeConfig = 1,
  TransferFeeAmount = 2,
  MintCloseAuthority = 3,
  ConfidentialTransferMint = 4,
  ConfidentialTransferAccount = 5,
  DefaultAccountState = 6,
  ImmutableOwner = 7,
  MemoTransfer = 8,
  NonTransferable = 9,
  InterestBearingConfig = 10,
  CpiGuard = 11,
  PermanentDelegate = 12,
  NonTransferableAccount = 13,
  TransferHook = 14,
  TransferHookAccount = 15,
  MetadataPointer = 16,
  TokenMetadata = 17,
  GroupPointer = 18,
  GroupMemberPointer = 19,
  TokenGroup = 20,
  TokenGroupMember = 21,
}

/**
 * Transfer fee configuration
 */
export interface TransferFeeConfig {
  transferFeeConfigAuthority: PublicKey | null
  withdrawWithheldAuthority: PublicKey | null
  withheldAmount: bigint
  olderTransferFee: TransferFee
  newerTransferFee: TransferFee
}

export interface TransferFee {
  epoch: bigint
  maximumFee: bigint
  transferFeeBasisPoints: number
}

/**
 * Interest-bearing configuration
 */
export interface InterestBearingConfig {
  rateAuthority: PublicKey | null
  initializationTimestamp: bigint
  preUpdateAverageRate: number
  lastUpdateTimestamp: bigint
  currentRate: number
}

/**
 * Permanent delegate configuration
 */
export interface PermanentDelegate {
  delegate: PublicKey
}

/**
 * Transfer hook configuration
 */
export interface TransferHook {
  authority: PublicKey | null
  programId: PublicKey
}

/**
 * Metadata pointer configuration
 */
export interface MetadataPointer {
  authority: PublicKey | null
  metadataAddress: PublicKey
}

/**
 * Confidential transfer mint configuration
 */
export interface ConfidentialTransferMint {
  authority: PublicKey | null
  autoApproveNewAccounts: boolean
  auditorElGamalPubkey: Uint8Array
}

/**
 * CPI guard configuration
 */
export interface CpiGuardConfig {
  lockCpi: boolean
}

/**
 * Group pointer configuration
 */
export interface GroupPointer {
  authority: PublicKey | null
  groupAddress: PublicKey
}

/**
 * Group member pointer configuration
 */
export interface GroupMemberPointer {
  authority: PublicKey | null
  memberAddress: PublicKey
}

/**
 * Default account state
 */
export enum AccountState {
  Uninitialized = 0,
  Initialized = 1,
  Frozen = 2,
}

/**
 * Token-2022 mint info with extensions
 */
export interface Token2022Mint {
  mintAuthority: PublicKey | null
  supply: bigint
  decimals: number
  isInitialized: boolean
  freezeAuthority: PublicKey | null
  extensions: TokenExtension[]
}

/**
 * Generic extension wrapper
 */
export interface TokenExtension {
  type: ExtensionType
  data: unknown
}

/**
 * Create token options with extensions
 */
export interface CreateToken2022Options {
  decimals: number
  mintAuthority: PublicKey
  freezeAuthority?: PublicKey | null
  extensions?: ExtensionConfig[]
}

/**
 * Extension configuration for creation
 */
export type ExtensionConfig =
  | { type: 'transferFee'; feeBasisPoints: number; maxFee: bigint; feeAuthority: PublicKey; withdrawAuthority: PublicKey }
  | { type: 'interestBearing'; rate: number; rateAuthority: PublicKey }
  | { type: 'permanentDelegate'; delegate: PublicKey }
  | { type: 'transferHook'; programId: PublicKey; authority?: PublicKey }
  | { type: 'metadataPointer'; metadataAddress: PublicKey; authority?: PublicKey }
  | { type: 'mintCloseAuthority'; closeAuthority: PublicKey }
  | { type: 'defaultAccountState'; state: AccountState }
  | { type: 'nonTransferable' }
  | { type: 'immutableOwner' }
  | { type: 'memoTransfer' }
  | { type: 'cpiGuard' }
  | { type: 'confidentialTransfer'; authority?: PublicKey; autoApproveNewAccounts?: boolean; auditorElGamalPubkey?: Uint8Array }
  | { type: 'groupPointer'; authority?: PublicKey; groupAddress?: PublicKey }
  | { type: 'groupMemberPointer'; authority?: PublicKey; memberAddress?: PublicKey }
