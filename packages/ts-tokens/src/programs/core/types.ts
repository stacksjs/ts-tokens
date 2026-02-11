/**
 * Core Asset Program Types
 *
 * Type definitions for the Metaplex Core Asset program.
 * Program ID: CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Core Asset Program ID
 */
export const CORE_PROGRAM_ID = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d'

/**
 * Core Asset account
 */
export interface Asset {
  /** Account key discriminator */
  key: number
  /** Asset owner */
  owner: PublicKey
  /** Update authority (address or collection) */
  updateAuthority: {
    type: 'None' | 'Address' | 'Collection'
    address?: PublicKey
  }
  /** Asset name */
  name: string
  /** Asset URI (off-chain metadata) */
  uri: string
  /** Sequence number for ordering */
  seq: bigint | null
}

/**
 * Core Collection account
 */
export interface CoreCollection {
  /** Account key discriminator */
  key: number
  /** Update authority */
  updateAuthority: PublicKey
  /** Collection name */
  name: string
  /** Collection URI */
  uri: string
  /** Number of assets in collection */
  numMinted: number
  /** Current collection size */
  currentSize: number
}

/**
 * Core Plugin types
 *
 * Plugins add functionality to Core assets and collections.
 * Each plugin has a type and optional authority.
 */
export type PluginType =
  | 'Royalties'
  | 'FreezeDelegate'
  | 'BurnDelegate'
  | 'TransferDelegate'
  | 'UpdateDelegate'
  | 'PermanentFreezeDelegate'
  | 'Attributes'
  | 'PermanentTransferDelegate'
  | 'PermanentBurnDelegate'
  | 'Edition'
  | 'MasterEdition'
  | 'AddBlocker'
  | 'ImmutableMetadata'
  | 'VerifiedCreators'
  | 'Autograph'
  | 'AppData'

/**
 * Plugin authority configuration
 */
export interface PluginAuthority {
  type: 'Owner' | 'UpdateAuthority' | 'Address' | 'None'
  address?: string
}

/**
 * Attribute key-value pair
 */
export interface Attribute {
  key: string
  value: string
}

/**
 * Creator entry for royalties plugin
 */
export interface RoyaltyCreator {
  address: string
  percentage: number
}

/**
 * Rule set for royalties enforcement
 */
export interface RuleSet {
  type: 'None' | 'ProgramAllowList' | 'ProgramDenyList'
  programs?: string[]
}
