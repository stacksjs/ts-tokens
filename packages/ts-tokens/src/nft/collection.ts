/**
 * NFT Collection Management
 *
 * High-level wrappers for collection verify/unverify operations.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../types'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'
import { findMetadataPda, findMasterEditionPda } from '../programs/token-metadata/pda'
import {
  updateMetadataAccountV2,
  verifyCollection,
  unverifyCollection,
} from '../programs/token-metadata/instructions'

/**
 * Update collection NFT metadata
 */
export async function updateCollection(
  options: {
    collectionMint: string
    name?: string
    symbol?: string
    uri?: string
    sellerFeeBasisPoints?: number
    newUpdateAuthority?: string
    isMutable?: boolean
  },
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(options.collectionMint)
  const [metadata] = findMetadataPda(mintPubkey)

  const instruction = updateMetadataAccountV2({
    metadata,
    updateAuthority: payer.publicKey,
    newUpdateAuthority: options.newUpdateAuthority
      ? new PublicKey(options.newUpdateAuthority)
      : null,
    data: (options.name || options.symbol || options.uri || options.sellerFeeBasisPoints !== undefined)
      ? {
          name: options.name || '',
          symbol: options.symbol || '',
          uri: options.uri || '',
          sellerFeeBasisPoints: options.sellerFeeBasisPoints ?? 0,
          creators: null,
          collection: null,
          uses: null,
        }
      : null,
    primarySaleHappened: null,
    isMutable: options.isMutable ?? null,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, txOptions)
}

/**
 * Verify an NFT as part of a collection
 */
export async function verifyCollectionItem(
  nftMint: string,
  collectionMint: string,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const nftMintPubkey = new PublicKey(nftMint)
  const collectionMintPubkey = new PublicKey(collectionMint)

  const [nftMetadata] = findMetadataPda(nftMintPubkey)
  const [collectionMetadata] = findMetadataPda(collectionMintPubkey)
  const [collectionMasterEdition] = findMasterEditionPda(collectionMintPubkey)

  const instruction = verifyCollection({
    metadata: nftMetadata,
    collectionAuthority: payer.publicKey,
    payer: payer.publicKey,
    collectionMint: collectionMintPubkey,
    collection: collectionMetadata,
    collectionMasterEdition,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, txOptions)
}

/**
 * Unverify an NFT from a collection
 */
export async function unverifyCollectionItem(
  nftMint: string,
  collectionMint: string,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const nftMintPubkey = new PublicKey(nftMint)
  const collectionMintPubkey = new PublicKey(collectionMint)

  const [nftMetadata] = findMetadataPda(nftMintPubkey)
  const [collectionMetadata] = findMetadataPda(collectionMintPubkey)
  const [collectionMasterEdition] = findMasterEditionPda(collectionMintPubkey)

  const instruction = unverifyCollection({
    metadata: nftMetadata,
    collectionAuthority: payer.publicKey,
    payer: payer.publicKey,
    collectionMint: collectionMintPubkey,
    collection: collectionMetadata,
    collectionMasterEdition,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, txOptions)
}
