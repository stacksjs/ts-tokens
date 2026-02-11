/**
 * Core Asset Program Instructions
 *
 * Convenience wrappers that re-export the MPL Core instruction builders
 * with asset-centric naming conventions.
 *
 * Program ID: CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d
 */

import {
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  createV2,
  transferV1,
  burnV1,
  addPluginV1,
  removePluginV1,
} from '../mpl-core/instructions'
import type { CorePlugin } from '../../types/core'

/**
 * Create a Core asset
 *
 * Creates a new asset with the Metaplex Core standard.
 * Core assets are lightweight, single-account NFTs that support plugins.
 */
export function createAsset(params: {
  /** New asset keypair (signer) */
  asset: PublicKey
  /** Optional collection to add asset to */
  collection?: PublicKey
  /** Authority for the creation */
  authority?: PublicKey
  /** Payer for account creation */
  payer: PublicKey
  /** Asset owner (defaults to payer) */
  owner?: PublicKey
  /** Update authority (defaults to payer) */
  updateAuthority?: PublicKey
  /** Asset name */
  name: string
  /** Asset metadata URI */
  uri: string
  /** Plugins to initialize with the asset */
  plugins?: CorePlugin[]
}): TransactionInstruction {
  return createV2(params)
}

/**
 * Transfer a Core asset to a new owner
 */
export function transferAsset(params: {
  /** Asset to transfer */
  asset: PublicKey
  /** Collection the asset belongs to (optional) */
  collection?: PublicKey
  /** Current owner or delegate (payer/signer) */
  payer: PublicKey
  /** Transfer authority (defaults to payer) */
  authority?: PublicKey
  /** New owner */
  newOwner: PublicKey
}): TransactionInstruction {
  return transferV1(params)
}

/**
 * Burn a Core asset
 *
 * Permanently destroys the asset and reclaims its rent.
 */
export function burnAsset(params: {
  /** Asset to burn */
  asset: PublicKey
  /** Collection the asset belongs to (optional) */
  collection?: PublicKey
  /** Owner or burn delegate (payer/signer) */
  payer: PublicKey
  /** Burn authority (defaults to payer) */
  authority?: PublicKey
}): TransactionInstruction {
  return burnV1(params)
}

/**
 * Add a plugin to a Core asset
 *
 * Plugins extend asset functionality (royalties, freeze, delegates, etc.)
 */
export function addPlugin(params: {
  /** Asset to add plugin to */
  asset: PublicKey
  /** Collection (optional) */
  collection?: PublicKey
  /** Payer for additional space */
  payer: PublicKey
  /** Authority (defaults to payer) */
  authority?: PublicKey
  /** Plugin to add */
  plugin: CorePlugin
}): TransactionInstruction {
  return addPluginV1(params)
}

/**
 * Remove a plugin from a Core asset
 */
export function removePlugin(params: {
  /** Asset to remove plugin from */
  asset: PublicKey
  /** Collection (optional) */
  collection?: PublicKey
  /** Payer */
  payer: PublicKey
  /** Authority (defaults to payer) */
  authority?: PublicKey
  /** Plugin type name to remove */
  pluginType: string
}): TransactionInstruction {
  return removePluginV1(params)
}
