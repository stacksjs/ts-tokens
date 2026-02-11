/**
 * Core Collection Operations
 *
 * Create and update MPL Core collections.
 */

import { Keypair, PublicKey } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import type {
  CoreCollectionResult,
  CreateCoreCollectionOptions,
  UpdateCoreCollectionOptions,
} from '../types/core'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import {
  createCollectionV2,
  updateCollectionV1,
} from '../programs/mpl-core/instructions'

/**
 * Create a new MPL Core collection
 */
export async function createCoreCollection(
  options: CreateCoreCollectionOptions,
  config: TokenConfig
): Promise<CoreCollectionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const collection = Keypair.generate()

  const instruction = createCollectionV2({
    collection: collection.publicKey,
    payer: payer.publicKey,
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

  transaction.partialSign(collection, payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options.options)

  return {
    address: collection.publicKey.toBase58(),
    signature: result.signature,
  }
}

/**
 * Update an MPL Core collection
 */
export async function updateCoreCollection(
  options: UpdateCoreCollectionOptions,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = updateCollectionV1({
    collection: new PublicKey(options.address),
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
