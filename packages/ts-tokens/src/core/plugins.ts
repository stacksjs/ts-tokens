/**
 * Core Plugin Management
 *
 * Add, remove, and update plugins on MPL Core assets and collections.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import type {
  AddCorePluginOptions,
  RemoveCorePluginOptions,
  CorePlugin,
} from '../types/core'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import {
  addPluginV1,
  removePluginV1,
  addCollectionPluginV1,
  removeCollectionPluginV1,
} from '../programs/mpl-core/instructions'

/**
 * Add a plugin to a Core asset
 */
export async function addAssetPlugin(
  options: AddCorePluginOptions,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = addPluginV1({
    asset: new PublicKey(options.address),
    collection: options.collection ? new PublicKey(options.collection) : undefined,
    payer: payer.publicKey,
    plugin: options.plugin,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options.options
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options.options)

  return { signature: result.signature }
}

/**
 * Remove a plugin from a Core asset
 */
export async function removeAssetPlugin(
  options: RemoveCorePluginOptions,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = removePluginV1({
    asset: new PublicKey(options.address),
    collection: options.collection ? new PublicKey(options.collection) : undefined,
    payer: payer.publicKey,
    pluginType: options.pluginType,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options.options
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options.options)

  return { signature: result.signature }
}

/**
 * Add a plugin to a Core collection
 */
export async function addCollectionPlugin(
  options: AddCorePluginOptions,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = addCollectionPluginV1({
    collection: new PublicKey(options.address),
    payer: payer.publicKey,
    plugin: options.plugin,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options.options
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options.options)

  return { signature: result.signature }
}

/**
 * Remove a plugin from a Core collection
 */
export async function removeCollectionPlugin(
  options: RemoveCorePluginOptions,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = removeCollectionPluginV1({
    collection: new PublicKey(options.address),
    payer: payer.publicKey,
    pluginType: options.pluginType,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options.options
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options.options)

  return { signature: result.signature }
}

/**
 * Create a royalties plugin configuration
 */
export function createRoyaltiesPlugin(
  basisPoints: number,
  creators: Array<{ address: string; percentage: number }>,
  ruleSet?: { type: 'None' } | { type: 'ProgramAllowList'; programs: string[] } | { type: 'ProgramDenyList'; programs: string[] }
): CorePlugin {
  return {
    type: 'Royalties',
    basisPoints,
    creators,
    ruleSet: ruleSet ?? { type: 'None' },
  }
}

/**
 * Create a freeze delegate plugin configuration
 */
export function createFreezePlugin(frozen: boolean = false): CorePlugin {
  return {
    type: 'FreezeDelegate',
    frozen,
  }
}

/**
 * Create an attributes plugin configuration
 */
export function createAttributesPlugin(
  attributes: Array<{ key: string; value: string }>
): CorePlugin {
  return {
    type: 'Attributes',
    attributeList: attributes,
  }
}

/**
 * Create an immutable metadata plugin
 */
export function createImmutableMetadataPlugin(): CorePlugin {
  return { type: 'ImmutableMetadata' }
}

/**
 * Create a permanent freeze plugin
 */
export function createPermanentFreezePlugin(frozen: boolean = true): CorePlugin {
  return {
    type: 'PermanentFreezeDelegate',
    frozen,
  }
}
