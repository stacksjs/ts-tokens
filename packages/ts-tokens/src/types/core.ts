/**
 * MPL Core Types
 *
 * Type definitions for the Metaplex Core NFT standard.
 */

import type { TransactionOptions } from './transaction'

/**
 * Core plugin types
 */
export type CorePluginType =
  | 'Royalties'
  | 'FreezeDelegate'
  | 'TransferDelegate'
  | 'BurnDelegate'
  | 'UpdateDelegate'
  | 'PermanentFreezeDelegate'
  | 'PermanentTransferDelegate'
  | 'PermanentBurnDelegate'
  | 'Attributes'
  | 'Edition'
  | 'MasterEdition'
  | 'AddBlocker'
  | 'ImmutableMetadata'
  | 'Autograph'
  | 'VerifiedCreators'
  | 'AppData'

/**
 * Core plugin authority types
 */
export type CorePluginAuthority =
  | { type: 'Owner' }
  | { type: 'UpdateAuthority' }
  | { type: 'Address'; address: string }
  | { type: 'None' }

/**
 * Royalties rule set
 */
export type RuleSet =
  | { type: 'None' }
  | { type: 'ProgramAllowList'; programs: string[] }
  | { type: 'ProgramDenyList'; programs: string[] }

/**
 * Core plugin discriminated union
 */
export type CorePlugin =
  | { type: 'Royalties'; basisPoints: number; creators: Array<{ address: string; percentage: number }>; ruleSet: RuleSet }
  | { type: 'FreezeDelegate'; frozen: boolean; authority?: CorePluginAuthority }
  | { type: 'TransferDelegate'; authority?: CorePluginAuthority }
  | { type: 'BurnDelegate'; authority?: CorePluginAuthority }
  | { type: 'UpdateDelegate'; authority?: CorePluginAuthority; additionalDelegates?: string[] }
  | { type: 'PermanentFreezeDelegate'; frozen: boolean }
  | { type: 'PermanentTransferDelegate'; authority?: CorePluginAuthority }
  | { type: 'PermanentBurnDelegate'; authority?: CorePluginAuthority }
  | { type: 'Attributes'; attributeList: Array<{ key: string; value: string }> }
  | { type: 'Edition'; number: number }
  | { type: 'MasterEdition'; maxSupply?: number; name?: string; uri?: string }
  | { type: 'AddBlocker' }
  | { type: 'ImmutableMetadata' }
  | { type: 'Autograph'; signatures: Array<{ address: string; message: string }> }
  | { type: 'VerifiedCreators'; signatures: Array<{ address: string; verified: boolean }> }
  | { type: 'AppData'; dataAuthority?: CorePluginAuthority; data: Record<string, unknown> }

/**
 * Core asset
 */
export interface CoreAsset {
  address: string
  owner: string
  updateAuthority: string | { type: 'Collection'; address: string }
  name: string
  uri: string
  plugins: CorePlugin[]
}

/**
 * Core collection
 */
export interface CoreCollection {
  address: string
  updateAuthority: string
  name: string
  uri: string
  numMinted: number
  currentSize: number
  plugins: CorePlugin[]
}

/**
 * Options for creating a Core asset
 */
export interface CreateCoreAssetOptions {
  name: string
  uri: string
  collection?: string
  plugins?: CorePlugin[]
  owner?: string
  updateAuthority?: string
  options?: TransactionOptions
}

/**
 * Options for creating a Core collection
 */
export interface CreateCoreCollectionOptions {
  name: string
  uri: string
  plugins?: CorePlugin[]
  updateAuthority?: string
  options?: TransactionOptions
}

/**
 * Options for updating a Core asset
 */
export interface UpdateCoreAssetOptions {
  address: string
  name?: string
  uri?: string
  newUpdateAuthority?: string
  collection?: string
  options?: TransactionOptions
}

/**
 * Options for updating a Core collection
 */
export interface UpdateCoreCollectionOptions {
  address: string
  name?: string
  uri?: string
  newUpdateAuthority?: string
  options?: TransactionOptions
}

/**
 * Options for adding a plugin to a Core asset or collection
 */
export interface AddCorePluginOptions {
  address: string
  plugin: CorePlugin
  collection?: string
  options?: TransactionOptions
}

/**
 * Options for removing a plugin from a Core asset or collection
 */
export interface RemoveCorePluginOptions {
  address: string
  pluginType: CorePluginType
  collection?: string
  options?: TransactionOptions
}

/**
 * Core asset creation result
 */
export interface CoreAssetResult {
  address: string
  signature: string
}

/**
 * Core collection creation result
 */
export interface CoreCollectionResult {
  address: string
  signature: string
}
