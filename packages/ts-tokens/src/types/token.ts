/**
 * Fungible Token Types
 *
 * Type definitions for fungible token operations.
 */

import type { Creator } from './metadata'
import type { TransactionOptions } from './transaction'

/**
 * Token creation options
 */
export interface CreateTokenOptions {
  /**
   * Token name (for metadata)
   */
  name: string

  /**
   * Token symbol (max 10 characters)
   */
  symbol: string

  /**
   * Number of decimal places (0-9)
   * @default 9
   */
  decimals?: number

  /**
   * Initial supply to mint (in base units)
   */
  initialSupply?: bigint | number

  /**
   * Mint authority public key
   * @default Current wallet
   */
  mintAuthority?: string

  /**
   * Freeze authority public key (optional)
   * Set to null to disable freezing
   */
  freezeAuthority?: string | null

  /**
   * Token metadata URI (JSON file URL)
   */
  uri?: string

  /**
   * Token description
   */
  description?: string

  /**
   * Token image URL
   */
  image?: string

  /**
   * Creator array for royalties
   */
  creators?: Creator[]

  /**
   * Whether metadata can be updated
   * @default true
   */
  isMutable?: boolean

  /**
   * Use Token-2022 program instead of legacy SPL Token
   * @default false
   */
  useToken2022?: boolean

  /**
   * Token-2022 extensions to enable
   */
  extensions?: TokenExtension[]

  /**
   * Transaction options
   */
  options?: TransactionOptions
}

/**
 * Token-2022 extension types
 */
export type TokenExtension
  = | { type: 'transferFee', feeBasisPoints: number, maxFee: bigint, feeAuthority: string, withdrawAuthority: string }
    | { type: 'interestBearing', rate: number, rateAuthority: string }
    | { type: 'nonTransferable' }
    | { type: 'permanentDelegate', delegate: string }
    | { type: 'transferHook', programId: string }
    | { type: 'metadataPointer', metadataAddress: string }
    | { type: 'confidentialTransfer' }
    | { type: 'defaultAccountState', state: 'initialized' | 'frozen' }
    | { type: 'memoRequired' }
    | { type: 'cpiGuard' }

/**
 * Token minting options
 */
export interface MintOptions {
  /**
   * Token mint address
   */
  mint: string

  /**
   * Recipient address
   * @default Current wallet
   */
  destination?: string

  /**
   * Amount to mint (in base units)
   */
  amount: bigint | number

  /**
   * Mint authority (must be signer)
   */
  mintAuthority?: string

  /**
   * Transaction options
   */
  options?: TransactionOptions
}

/**
 * Token burn options
 */
export interface BurnOptions {
  /**
   * Token mint address
   */
  mint: string

  /**
   * Token account to burn from
   * @default Associated token account of current wallet
   */
  from?: string

  /**
   * Amount to burn (in base units)
   */
  amount: bigint | number

  /**
   * Owner of the token account (must be signer)
   */
  owner?: string

  /**
   * Transaction options
   */
  options?: TransactionOptions
}

/**
 * Token information returned from queries
 */
export interface TokenInfo {
  /**
   * Token mint address
   */
  mint: string

  /**
   * Current supply (in base units)
   */
  supply: bigint

  /**
   * Number of decimal places
   */
  decimals: number

  /**
   * Mint authority (null if revoked)
   */
  mintAuthority: string | null

  /**
   * Freeze authority (null if disabled)
   */
  freezeAuthority: string | null

  /**
   * Whether this is a Token-2022 token
   */
  isToken2022: boolean

  /**
   * Token-2022 extensions (if applicable)
   */
  extensions?: TokenExtension[]

  /**
   * Token metadata (if available)
   */
  metadata?: {
    name: string
    symbol: string
    uri: string
    sellerFeeBasisPoints: number
    creators: Creator[]
    isMutable: boolean
    updateAuthority: string
  }
}

/**
 * Token account information
 */
export interface TokenAccountInfo {
  /**
   * Token account address
   */
  address: string

  /**
   * Token mint address
   */
  mint: string

  /**
   * Account owner
   */
  owner: string

  /**
   * Token balance (in base units)
   */
  balance: bigint

  /**
   * Delegate (if any)
   */
  delegate: string | null

  /**
   * Delegated amount
   */
  delegatedAmount: bigint

  /**
   * Whether account is frozen
   */
  isFrozen: boolean

  /**
   * Whether this is a native SOL account
   */
  isNative: boolean

  /**
   * Close authority (if any)
   */
  closeAuthority: string | null
}

/**
 * Token holder information
 */
export interface TokenHolder {
  /**
   * Holder's wallet address
   */
  owner: string

  /**
   * Token account address
   */
  tokenAccount: string

  /**
   * Balance (in base units)
   */
  balance: bigint

  /**
   * Percentage of total supply
   */
  percentage: number
}

/**
 * Token transfer event
 */
export interface TokenTransferEvent {
  /**
   * Transaction signature
   */
  signature: string

  /**
   * Token mint address
   */
  mint: string

  /**
   * Source address
   */
  from: string

  /**
   * Destination address
   */
  to: string

  /**
   * Amount transferred (in base units)
   */
  amount: bigint

  /**
   * Block timestamp
   */
  timestamp: number

  /**
   * Slot number
   */
  slot: number
}
