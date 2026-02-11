/**
 * Token Metadata Management
 *
 * Create, update, and fetch metadata for fungible tokens.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../types'
import type { Creator as MetaplexCreator, DataV2 } from '../programs/token-metadata/types'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'
import { findMetadataPda } from '../programs/token-metadata/pda'
import { createMetadataAccountV3, updateMetadataAccountV2 } from '../programs/token-metadata/instructions'
import { deserializeMetadata } from '../programs/token-metadata/accounts'

/**
 * Options for creating token metadata
 */
export interface CreateTokenMetadataOptions {
  /** Token mint address */
  mint: string
  /** Display name */
  name: string
  /** Token symbol */
  symbol: string
  /** Metadata JSON URI */
  uri?: string
  /** Royalty in basis points (0 for fungible tokens) */
  sellerFeeBasisPoints?: number
  /** Creator array */
  creators?: Array<{ address: string; verified: boolean; share: number }>
  /** Whether metadata can be updated later */
  isMutable?: boolean
  /** Transaction options */
  options?: TransactionOptions
}

/**
 * Options for updating token metadata
 */
export interface UpdateTokenMetadataOptions {
  /** Token mint address */
  mint: string
  /** New display name */
  name?: string
  /** New token symbol */
  symbol?: string
  /** New metadata JSON URI */
  uri?: string
  /** New royalty in basis points */
  sellerFeeBasisPoints?: number
  /** New creator array */
  creators?: Array<{ address: string; verified: boolean; share: number }>
  /** Set new update authority */
  newUpdateAuthority?: string
  /** Mark primary sale as happened */
  primarySaleHappened?: boolean
  /** Whether metadata can be updated */
  isMutable?: boolean
  /** Transaction options */
  options?: TransactionOptions
}

/**
 * Token metadata result from on-chain fetch
 */
export interface TokenMetadataResult {
  /** Token mint address */
  mint: string
  /** Metadata account address */
  metadataAddress: string
  /** Update authority */
  updateAuthority: string
  /** Token name */
  name: string
  /** Token symbol */
  symbol: string
  /** Metadata JSON URI */
  uri: string
  /** Royalty in basis points */
  sellerFeeBasisPoints: number
  /** Creator array */
  creators: Array<{ address: string; verified: boolean; share: number }>
  /** Whether primary sale has happened */
  primarySaleHappened: boolean
  /** Whether metadata is mutable */
  isMutable: boolean
}

/**
 * Fetch on-chain metadata for a token
 *
 * Read-only operation - no wallet needed.
 *
 * @param mint - Token mint address
 * @param config - Token configuration
 * @returns Token metadata or null if no metadata exists
 */
export async function getTokenMetadata(
  mint: string,
  config: TokenConfig
): Promise<TokenMetadataResult | null> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)
  const [metadataAddress] = findMetadataPda(mintPubkey)

  const accountInfo = await connection.getAccountInfo(metadataAddress)
  if (!accountInfo) {
    return null
  }

  try {
    const metadata = deserializeMetadata(accountInfo.data as Buffer)

    const creators: Array<{ address: string; verified: boolean; share: number }> = []
    if (metadata.data.creators) {
      for (const creator of metadata.data.creators) {
        creators.push({
          address: creator.address.toBase58(),
          verified: creator.verified,
          share: creator.share,
        })
      }
    }

    return {
      mint,
      metadataAddress: metadataAddress.toBase58(),
      updateAuthority: metadata.updateAuthority.toBase58(),
      name: metadata.data.name,
      symbol: metadata.data.symbol,
      uri: metadata.data.uri,
      sellerFeeBasisPoints: metadata.data.sellerFeeBasisPoints,
      creators,
      primarySaleHappened: metadata.primarySaleHappened,
      isMutable: metadata.isMutable,
    }
  } catch {
    return null
  }
}

/**
 * Create metadata for an existing token mint
 *
 * @param options - Metadata creation options
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function createTokenMetadata(
  options: CreateTokenMetadataOptions,
  config: TokenConfig
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(options.mint)

  // Convert string-based creators to PublicKey-based for the instruction builder
  let creators: MetaplexCreator[] | null = null
  if (options.creators && options.creators.length > 0) {
    creators = options.creators.map(c => ({
      address: new PublicKey(c.address),
      verified: c.verified,
      share: c.share,
    }))
  }

  const data: DataV2 = {
    name: options.name,
    symbol: options.symbol,
    uri: options.uri || '',
    sellerFeeBasisPoints: options.sellerFeeBasisPoints ?? 0,
    creators,
    collection: null,
    uses: null,
  }

  const instruction = createMetadataAccountV3({
    mint: mintPubkey,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
    updateAuthority: payer.publicKey,
    data,
    isMutable: options.isMutable ?? true,
    collectionDetails: null,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options.options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options.options)
}

/**
 * Update metadata for an existing token
 *
 * Fetches current metadata first and merges updates, so only provided fields change.
 *
 * @param options - Metadata update options
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function updateTokenMetadata(
  options: UpdateTokenMetadataOptions,
  config: TokenConfig
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(options.mint)
  const [metadataAddress] = findMetadataPda(mintPubkey)

  // Fetch current metadata to merge with updates
  const accountInfo = await connection.getAccountInfo(metadataAddress)
  if (!accountInfo) {
    throw new Error(`No metadata found for mint ${options.mint}`)
  }

  const currentMetadata = deserializeMetadata(accountInfo.data as Buffer)

  // Build updated data, merging current values with provided updates
  let updatedCreators: MetaplexCreator[] | null = currentMetadata.data.creators
  if (options.creators) {
    updatedCreators = options.creators.map(c => ({
      address: new PublicKey(c.address),
      verified: c.verified,
      share: c.share,
    }))
  }

  const updatedData: DataV2 = {
    name: options.name ?? currentMetadata.data.name,
    symbol: options.symbol ?? currentMetadata.data.symbol,
    uri: options.uri ?? currentMetadata.data.uri,
    sellerFeeBasisPoints: options.sellerFeeBasisPoints ?? currentMetadata.data.sellerFeeBasisPoints,
    creators: updatedCreators,
    collection: currentMetadata.data.collection,
    uses: currentMetadata.data.uses,
  }

  const instruction = updateMetadataAccountV2({
    metadata: metadataAddress,
    updateAuthority: payer.publicKey,
    newUpdateAuthority: options.newUpdateAuthority
      ? new PublicKey(options.newUpdateAuthority)
      : null,
    data: updatedData,
    primarySaleHappened: options.primarySaleHappened ?? null,
    isMutable: options.isMutable ?? null,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options.options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options.options)
}
