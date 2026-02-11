/**
 * Core Asset Operations
 *
 * Create, transfer, burn, and update MPL Core assets.
 */

import { Keypair, PublicKey } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import type {
  CoreAssetResult,
  CreateCoreAssetOptions,
  UpdateCoreAssetOptions,
} from '../types/core'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import {
  createV2,
  transferV1,
  burnV1,
  updateV1,
} from '../programs/mpl-core/instructions'

/**
 * Create a new MPL Core asset
 */
export async function createCoreAsset(
  options: CreateCoreAssetOptions,
  config: TokenConfig
): Promise<CoreAssetResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const asset = Keypair.generate()

  const instruction = createV2({
    asset: asset.publicKey,
    collection: options.collection ? new PublicKey(options.collection) : undefined,
    payer: payer.publicKey,
    owner: options.owner ? new PublicKey(options.owner) : undefined,
    updateAuthority: options.updateAuthority ? new PublicKey(options.updateAuthority) : undefined,
    name: options.name,
    uri: options.uri,
    plugins: options.plugins,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options.options
  )

  transaction.partialSign(asset, payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options.options)

  return {
    address: asset.publicKey.toBase58(),
    signature: result.signature,
  }
}

/**
 * Transfer an MPL Core asset to a new owner
 */
export async function transferCoreAsset(
  assetAddress: string,
  newOwner: string,
  config: TokenConfig,
  collectionAddress?: string
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = transferV1({
    asset: new PublicKey(assetAddress),
    collection: collectionAddress ? new PublicKey(collectionAddress) : undefined,
    payer: payer.publicKey,
    newOwner: new PublicKey(newOwner),
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return { signature: result.signature }
}

/**
 * Burn an MPL Core asset
 */
export async function burnCoreAsset(
  assetAddress: string,
  config: TokenConfig,
  collectionAddress?: string
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = burnV1({
    asset: new PublicKey(assetAddress),
    collection: collectionAddress ? new PublicKey(collectionAddress) : undefined,
    payer: payer.publicKey,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return { signature: result.signature }
}

/**
 * Update an MPL Core asset
 */
export async function updateCoreAsset(
  options: UpdateCoreAssetOptions,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = updateV1({
    asset: new PublicKey(options.address),
    collection: options.collection ? new PublicKey(options.collection) : undefined,
    payer: payer.publicKey,
    newName: options.name,
    newUri: options.uri,
    newUpdateAuthority: options.newUpdateAuthority ? new PublicKey(options.newUpdateAuthority) : undefined,
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
