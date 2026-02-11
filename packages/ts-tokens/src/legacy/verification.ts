/**
 * Legacy Collection Verification
 *
 * Verify and unverify NFTs in collections, migrate to sized collections.
 */

import type { TokenConfig, TransactionResult, TransactionOptions } from '../types'
import type { ProgressCallback, BatchResult } from '../types/legacy'
import { executeBatch } from './batch'

/**
 * Verify an NFT in a collection
 */
export async function verifyNFTInCollection(
  nftMint: string,
  collectionMint: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { verifyCollectionItem } = await import('../nft/collection')
  return verifyCollectionItem(nftMint, collectionMint, config, options)
}

/**
 * Unverify an NFT from a collection
 */
export async function unverifyNFTFromCollection(
  nftMint: string,
  collectionMint: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { unverifyCollectionItem } = await import('../nft/collection')
  return unverifyCollectionItem(nftMint, collectionMint, config, options)
}

/**
 * Batch verify NFTs in a collection
 */
export async function batchVerifyCollection(
  nftMints: string[],
  collectionMint: string,
  config: TokenConfig,
  options?: {
    batchSize?: number
    delayMs?: number
    onProgress?: ProgressCallback
  }
): Promise<BatchResult<string>> {
  return executeBatch({
    items: nftMints,
    processor: async (nftMint) => {
      const result = await verifyNFTInCollection(nftMint, collectionMint, config)
      return result.signature
    },
    batchSize: options?.batchSize,
    delayMs: options?.delayMs,
    onProgress: options?.onProgress,
  })
}

/**
 * Set and verify collection for an NFT (re-export)
 */
export async function setAndVerifyCollection(
  nftMint: string,
  collectionMint: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { setAndVerifyCollection: setAndVerify } = await import('../nft/metadata')
  return setAndVerify(nftMint, collectionMint, config, options)
}

/**
 * Migrate a legacy collection to a sized collection
 *
 * Sets the collection size on the collection NFT metadata using
 * the SetCollectionSize instruction.
 */
export async function migrateToSizedCollection(
  collectionMint: string,
  size: number,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { findMetadataPda } = await import('../programs/token-metadata/pda')
  const { setCollectionSize } = await import('../programs/token-metadata/instructions')

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(collectionMint)
  const [collectionMetadata] = findMetadataPda(mintPubkey)

  const instruction = setCollectionSize({
    collectionMetadata,
    collectionAuthority: payer.publicKey,
    collectionMint: mintPubkey,
    size: BigInt(size),
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}
