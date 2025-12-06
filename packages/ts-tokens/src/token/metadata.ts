/**
 * Token Metadata Operations
 *
 * Create and manage metadata for SPL tokens using Token Metadata Program.
 */

import type { Metadata } from '../programs/token-metadata'
import type { Creator, TokenConfig } from '../types'
import { PublicKey } from '@solana/web3.js'
import { getCurrentConfig } from '../config'
import { createConnection } from '../drivers/solana/connection'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import {
  createMetadataAccountV3,
  deserializeMetadata,
  findMetadataPda,
  updateMetadataAccountV2,
} from '../programs/token-metadata'

/**
 * Options for creating token metadata
 */
export interface CreateTokenMetadataOptions {
  /**
   * Token mint address
   */
  mint: string | PublicKey

  /**
   * Token name
   */
  name: string

  /**
   * Token symbol
   */
  symbol: string

  /**
   * URI to off-chain metadata JSON
   */
  uri: string

  /**
   * Seller fee basis points (royalty for secondary sales)
   * @default 0
   */
  sellerFeeBasisPoints?: number

  /**
   * Array of creators with their shares
   */
  creators?: Creator[]

  /**
   * Whether metadata can be updated
   * @default true
   */
  isMutable?: boolean
}

/**
 * Options for updating token metadata
 */
export interface UpdateTokenMetadataOptions {
  /**
   * Token mint address
   */
  mint: string | PublicKey

  /**
   * New name (optional)
   */
  name?: string

  /**
   * New symbol (optional)
   */
  symbol?: string

  /**
   * New URI (optional)
   */
  uri?: string

  /**
   * New seller fee basis points (optional)
   */
  sellerFeeBasisPoints?: number

  /**
   * New creators array (optional)
   */
  creators?: Creator[]
}

/**
 * Create metadata account for an existing SPL token
 *
 * @param options - Creation options
 * @param config - Optional configuration override
 * @returns Transaction signature and metadata PDA
 *
 * @example
 * ```ts
 * const { signature, metadata } = await createTokenMetadata({
 *   mint: 'TokenMintAddress...',
 *   name: 'My Token',
 *   symbol: 'MTK',
 *   uri: 'https://arweave.net/metadata.json',
 *   sellerFeeBasisPoints: 0,
 *   creators: [{
 *     address: wallet.publicKey.toBase58(),
 *     share: 100,
 *     verified: true
 *   }]
 * })
 * ```
 */
export async function createTokenMetadata(
  options: CreateTokenMetadataOptions,
  config?: TokenConfig,
): Promise<{
  signature: string
  metadata: string
}> {
  const activeConfig = config || getCurrentConfig()
  const connection = createConnection(activeConfig)
  const wallet = await loadWallet(activeConfig)

  const mint = typeof options.mint === 'string'
    ? new PublicKey(options.mint)
    : options.mint

  // Find metadata PDA
  const [metadataPda] = findMetadataPda(mint)

  // Build create metadata instruction
  const instruction = createMetadataAccountV3({
    mint,
    mintAuthority: wallet.publicKey,
    payer: wallet.publicKey,
    updateAuthority: wallet.publicKey,
    data: {
      name: options.name,
      symbol: options.symbol,
      uri: options.uri,
      sellerFeeBasisPoints: options.sellerFeeBasisPoints ?? 0,
      creators: options.creators
        ? options.creators.map(c => ({
            address: typeof c.address === 'string' ? new PublicKey(c.address) : c.address as any,
            verified: c.verified,
            share: c.share,
          }))
        : null,
      collection: null,
      uses: null,
    },
    isMutable: options.isMutable ?? true,
    collectionDetails: null,
  })

  // Send transaction
  const transaction = await buildTransaction(
    connection,
    [instruction],
    wallet.publicKey,
  )

  const result = await sendAndConfirmTransaction(
    connection,
    transaction,
  )

  return {
    signature: result.signature,
    metadata: metadataPda.toBase58(),
  }
}

/**
 * Update existing token metadata
 *
 * @param options - Update options
 * @param config - Optional configuration override
 * @returns Transaction signature
 *
 * @example
 * ```ts
 * const { signature } = await updateTokenMetadata({
 *   mint: 'TokenMintAddress...',
 *   name: 'Updated Token Name',
 *   uri: 'https://arweave.net/new-metadata.json'
 * })
 * ```
 */
export async function updateTokenMetadata(
  options: UpdateTokenMetadataOptions,
  config?: TokenConfig,
): Promise<{ signature: string }> {
  const activeConfig = config || getCurrentConfig()
  const connection = createConnection(activeConfig)
  const wallet = await loadWallet(activeConfig)

  const mint = typeof options.mint === 'string'
    ? new PublicKey(options.mint)
    : options.mint

  // Find metadata PDA
  const [metadataPda] = findMetadataPda(mint)

  // Get current metadata to preserve unmodified fields
  const currentMetadata = await getTokenMetadata(options.mint, config)

  // Build update instruction with merged data
  const instruction = updateMetadataAccountV2({
    metadata: metadataPda,
    updateAuthority: wallet.publicKey,
    newUpdateAuthority: null, // Keep same update authority
    data: {
      name: options.name ?? currentMetadata.data.name,
      symbol: options.symbol ?? currentMetadata.data.symbol,
      uri: options.uri ?? currentMetadata.data.uri,
      sellerFeeBasisPoints: options.sellerFeeBasisPoints ?? currentMetadata.data.sellerFeeBasisPoints,
      creators: options.creators
        ? options.creators.map(c => ({
            address: typeof c.address === 'string' ? new PublicKey(c.address) : c.address as any,
            verified: c.verified,
            share: c.share,
          }))
        : currentMetadata.data.creators,
      collection: currentMetadata.data.collection,
      uses: currentMetadata.data.uses,
    },
    primarySaleHappened: currentMetadata.primarySaleHappened,
    isMutable: currentMetadata.isMutable,
  })

  // Send transaction
  const transaction = await buildTransaction(
    connection,
    [instruction],
    wallet.publicKey,
  )

  const result = await sendAndConfirmTransaction(
    connection,
    transaction,
  )

  return { signature: result.signature }
}

/**
 * Get token metadata from on-chain account
 *
 * @param mint - Token mint address
 * @param config - Optional configuration override
 * @returns Metadata account data
 *
 * @example
 * ```ts
 * const metadata = await getTokenMetadata('TokenMintAddress...')
 * console.log(metadata.data.name, metadata.data.symbol, metadata.data.uri)
 * ```
 */
export async function getTokenMetadata(
  mint: string | PublicKey,
  config?: TokenConfig,
): Promise<Metadata> {
  const activeConfig = config || getCurrentConfig()
  const connection = createConnection(activeConfig)

  const mintKey = typeof mint === 'string' ? new PublicKey(mint) : mint
  const [metadataPda] = findMetadataPda(mintKey)

  const accountInfo = await connection.getAccountInfo(metadataPda)

  if (!accountInfo) {
    throw new Error(`Metadata account not found for mint: ${mintKey.toBase58()}`)
  }

  return deserializeMetadata(accountInfo.data)
}

/**
 * Fetch off-chain metadata JSON from URI
 *
 * @param uri - Metadata URI (IPFS, Arweave, HTTP)
 * @returns Parsed JSON metadata
 *
 * @example
 * ```ts
 * const offChainData = await fetchOffChainMetadata('https://arweave.net/...')
 * console.log(offChainData.image, offChainData.description)
 * ```
 */
export async function fetchOffChainMetadata(uri: string): Promise<any> {
  // Handle IPFS URIs
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '')
    uri = `https://ipfs.io/ipfs/${cid}`
  }

  // Handle Arweave URIs
  if (uri.startsWith('ar://')) {
    const txId = uri.replace('ar://', '')
    uri = `https://arweave.net/${txId}`
  }

  const response = await fetch(uri)

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata from ${uri}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get complete token metadata (on-chain + off-chain)
 *
 * @param mint - Token mint address
 * @param config - Optional configuration override
 * @returns Combined metadata object
 *
 * @example
 * ```ts
 * const fullMetadata = await getCompleteTokenMetadata('TokenMintAddress...')
 * console.log({
 *   onChain: fullMetadata.onChain,
 *   offChain: fullMetadata.offChain
 * })
 * ```
 */
export async function getCompleteTokenMetadata(
  mint: string | PublicKey,
  config?: TokenConfig,
): Promise<{
  onChain: Metadata
  offChain: any
}> {
  const onChain = await getTokenMetadata(mint, config)
  const offChain = await fetchOffChainMetadata(onChain.data.uri)

  return {
    onChain,
    offChain,
  }
}
