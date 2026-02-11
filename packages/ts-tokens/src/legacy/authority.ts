/**
 * Legacy Authority & Creator Management
 *
 * Manage update authorities, collection authorities, and creator verification.
 */

import type { TokenConfig, TransactionResult, TransactionOptions } from '../types'
import type { CollectionAuthorities, ProgressCallback, BatchResult } from '../types/legacy'
import { executeBatch } from './batch'

/**
 * Get collection authorities
 */
export async function getCollectionAuthorities(
  collectionMint: string,
  config: TokenConfig
): Promise<CollectionAuthorities> {
  const { getNFTMetadata } = await import('../nft/metadata')
  const { PublicKey } = await import('@solana/web3.js')
  const { createConnection } = await import('../drivers/solana/connection')
  const { findMetadataPda, findCollectionAuthorityPda } = await import('../programs/token-metadata/pda')

  const metadata = await getNFTMetadata(collectionMint, config)
  if (!metadata) {
    throw new Error(`Collection not found: ${collectionMint}`)
  }

  // The update authority is always the primary authority
  const delegatedAuthorities: string[] = []

  // Check if any collection authority records exist
  // This would require scanning, but we return the update authority as the known authority
  return {
    updateAuthority: metadata.updateAuthority,
    delegatedAuthorities,
  }
}

/**
 * Transfer update authority for a collection
 */
export async function transferUpdateAuthority(
  collectionMint: string,
  newAuthority: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { findMetadataPda } = await import('../programs/token-metadata/pda')
  const { updateMetadataAccountV2 } = await import('../programs/token-metadata/instructions')

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(collectionMint)
  const [metadata] = findMetadataPda(mintPubkey)

  const instruction = updateMetadataAccountV2({
    metadata,
    updateAuthority: payer.publicKey,
    newUpdateAuthority: new PublicKey(newAuthority),
    data: null,
    primarySaleHappened: null,
    isMutable: null,
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

/**
 * Transfer update authority for an individual NFT
 */
export async function transferNFTUpdateAuthority(
  mint: string,
  newAuthority: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  return transferUpdateAuthority(mint, newAuthority, config, options)
}

/**
 * Batch transfer update authority for multiple NFTs
 */
export async function batchTransferUpdateAuthority(
  mints: string[],
  newAuthority: string,
  config: TokenConfig,
  options?: {
    batchSize?: number
    delayMs?: number
    onProgress?: ProgressCallback
  }
): Promise<BatchResult<string>> {
  return executeBatch({
    items: mints,
    processor: async (mint) => {
      const result = await transferUpdateAuthority(mint, newAuthority, config)
      return result.signature
    },
    batchSize: options?.batchSize,
    delayMs: options?.delayMs,
    onProgress: options?.onProgress,
  })
}

/**
 * Set a delegated collection authority
 */
export async function setCollectionAuthority(
  collectionMint: string,
  newAuthority: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { findMetadataPda, findCollectionAuthorityPda } = await import('../programs/token-metadata/pda')
  const { approveCollectionAuthority } = await import('../programs/token-metadata/instructions')

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(collectionMint)
  const newAuthorityPubkey = new PublicKey(newAuthority)

  const [metadata] = findMetadataPda(mintPubkey)
  const [collectionAuthorityRecord] = findCollectionAuthorityPda(mintPubkey, newAuthorityPubkey)

  const instruction = approveCollectionAuthority({
    collectionAuthorityRecord,
    newCollectionAuthority: newAuthorityPubkey,
    updateAuthority: payer.publicKey,
    payer: payer.publicKey,
    metadata,
    mint: mintPubkey,
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

/**
 * Revoke a delegated collection authority
 */
export async function revokeCollectionAuthority(
  collectionMint: string,
  authorityToRevoke: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { findMetadataPda, findCollectionAuthorityPda } = await import('../programs/token-metadata/pda')
  const { revokeCollectionAuthority: revokeAuth } = await import('../programs/token-metadata/instructions')

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(collectionMint)
  const authorityPubkey = new PublicKey(authorityToRevoke)

  const [metadata] = findMetadataPda(mintPubkey)
  const [collectionAuthorityRecord] = findCollectionAuthorityPda(mintPubkey, authorityPubkey)

  const instruction = revokeAuth({
    collectionAuthorityRecord,
    delegateAuthority: authorityPubkey,
    revokeAuthority: payer.publicKey,
    metadata,
    mint: mintPubkey,
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

/**
 * Verify a creator on an NFT (re-export)
 */
export async function verifyCreator(
  mint: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { verifyCreator: verify } = await import('../nft/metadata')
  return verify(mint, config, options)
}

/**
 * Unverify a creator on an NFT (re-export)
 */
export async function unverifyCreator(
  mint: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { unverifyCreator: unverify } = await import('../nft/metadata')
  return unverify(mint, config, options)
}

/**
 * Batch verify creator across multiple NFTs
 */
export async function batchVerifyCreator(
  mints: string[],
  config: TokenConfig,
  options?: {
    batchSize?: number
    delayMs?: number
    onProgress?: ProgressCallback
  }
): Promise<BatchResult<string>> {
  return executeBatch({
    items: mints,
    processor: async (mint) => {
      const result = await verifyCreator(mint, config)
      return result.signature
    },
    batchSize: options?.batchSize,
    delayMs: options?.delayMs,
    onProgress: options?.onProgress,
  })
}

/**
 * Update creators for an NFT
 */
export async function updateCreators(
  mint: string,
  creators: Array<{ address: string; share: number }>,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { updateNFTMetadata } = await import('../nft/metadata')
  return updateNFTMetadata(mint, { creators }, config, options)
}
