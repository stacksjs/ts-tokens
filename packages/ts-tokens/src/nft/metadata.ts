/**
 * NFT Metadata Management
 *
 * Update and fetch NFT metadata.
 */

import type { TransactionInstruction } from '@solana/web3.js'
import { Connection, PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions, NFTMetadata } from '../types'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'
import { deserializeMetadata } from '../programs/token-metadata/accounts'
import { updateMetadataAccountV2 } from '../programs/token-metadata/instructions'
import type { DataV2 } from '../programs/token-metadata/types'
import { mergeMetadataUpdates, type MetadataUpdates } from './metadata-merge'

/**
 * Token Metadata Program ID
 */
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Get metadata account PDA
 */
function getMetadataAddress(mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )
  return address
}

/**
 * Update NFT metadata.
 *
 * UpdateMetadataAccountV2 replaces the entire DataV2 struct, so this fetches the
 * current on-chain metadata and merges the requested changes over it —
 * preserving name/symbol/uri/royalties/creators/collection/uses that the caller
 * did not touch. Sending only the changed fields (as the old implementation did)
 * would blank every omitted field on-chain.
 */
export async function updateNFTMetadata(
  mint: string,
  updates: MetadataUpdates,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const metadataAddress = getMetadataAddress(mintPubkey)

  const accountInfo = await connection.getAccountInfo(metadataAddress)
  if (!accountInfo) {
    throw new Error(`Metadata account not found for mint ${mint}`)
  }

  const current = deserializeMetadata(accountInfo.data)

  // Merge the requested DataV2 changes over the current on-chain values.
  const { data, changed } = mergeMetadataUpdates(current.data, updates)

  const instruction = updateMetadataAccountV2({
    metadata: metadataAddress,
    updateAuthority: payer.publicKey,
    // Only rewrite DataV2 when something in it actually changed, otherwise leave
    // it untouched (None) so we never risk re-serializing it unnecessarily.
    data: changed ? (data as DataV2) : null,
    newUpdateAuthority: null,
    primarySaleHappened:
      updates.primarySaleHappened !== undefined ? updates.primarySaleHappened : null,
    isMutable: updates.isMutable !== undefined ? updates.isMutable : null,
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
 * Get on-chain NFT metadata
 */
export async function getNFTMetadata(
  mint: string,
  config: TokenConfig
): Promise<NFTMetadata | null> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)
  const metadataAddress = getMetadataAddress(mintPubkey)

  const accountInfo = await connection.getAccountInfo(metadataAddress)
  if (!accountInfo) {
    return null
  }

  // Parse metadata account data
  return parseMetadataAccount(accountInfo.data, mint, metadataAddress.toBase58())
}

/**
 * Parse metadata account data
 */
function parseMetadataAccount(
  data: Buffer,
  mint: string,
  metadataAddress: string
): NFTMetadata {
  let offset = 1 // Skip key byte

  // Update authority (32 bytes)
  const updateAuthority = new PublicKey(data.slice(offset, offset + 32)).toBase58()
  offset += 32

  // Mint (32 bytes)
  offset += 32 // Skip, we already have it

  // Name (4 bytes length + string)
  const nameLength = data.readUInt32LE(offset)
  offset += 4
  const name = data.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '')
  offset += nameLength

  // Symbol (4 bytes length + string)
  const symbolLength = data.readUInt32LE(offset)
  offset += 4
  const symbol = data.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '')
  offset += symbolLength

  // URI (4 bytes length + string)
  const uriLength = data.readUInt32LE(offset)
  offset += 4
  const uri = data.slice(offset, offset + uriLength).toString('utf8').replace(/\0/g, '')
  offset += uriLength

  // Seller fee basis points
  const sellerFeeBasisPoints = data.readUInt16LE(offset)
  offset += 2

  // Creators (optional)
  const hasCreators = data.readUInt8(offset) === 1
  offset += 1

  const creators: Array<{ address: string; verified: boolean; share: number }> = []
  if (hasCreators) {
    const creatorsLength = data.readUInt32LE(offset)
    offset += 4
    for (let i = 0; i < creatorsLength; i++) {
      const address = new PublicKey(data.slice(offset, offset + 32)).toBase58()
      offset += 32
      const verified = data.readUInt8(offset) === 1
      offset += 1
      const share = data.readUInt8(offset)
      offset += 1
      creators.push({ address, verified, share })
    }
  }

  // Primary sale happened
  const primarySaleHappened = data.readUInt8(offset) === 1
  offset += 1

  // Is mutable
  const isMutable = data.readUInt8(offset) === 1
  offset += 1

  return {
    mint,
    metadataAddress,
    updateAuthority,
    name,
    symbol,
    uri,
    sellerFeeBasisPoints,
    creators,
    primarySaleHappened,
    isMutable,
  }
}

/**
 * Fetch off-chain metadata from URI
 */
export async function fetchOffChainMetadata(
  uri: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(uri, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

/**
 * Get full NFT data (on-chain + off-chain)
 */
// eslint-disable-next-line no-unused-vars
export async function getFullNFTData(
  mint: string,
  config: TokenConfig
): Promise<{
  onChain: NFTMetadata
  offChain: Record<string, unknown> | null
} | null> {
  const onChain = await getNFTMetadata(mint, config)
  if (!onChain) {
    return null
  }

  const offChain = await fetchOffChainMetadata(onChain.uri)

  return { onChain, offChain }
}

/**
 * Verify a creator on an NFT
 */
export async function verifyCreator(
  mint: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const metadataAddress = getMetadataAddress(mintPubkey)

  // SignMetadata instruction - discriminator: 7
  const data = Buffer.alloc(1)
  data.writeUInt8(7, 0)

  const instruction: TransactionInstruction = {
    keys: [
      { pubkey: metadataAddress, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  }

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
 * Remove creator verification from an NFT
 */
export async function unverifyCreator(
  mint: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const metadataAddress = getMetadataAddress(mintPubkey)

  // RemoveCreatorVerification instruction - discriminator: 28
  const data = Buffer.alloc(1)
  data.writeUInt8(28, 0)

  const instruction: TransactionInstruction = {
    keys: [
      { pubkey: metadataAddress, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  }

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
 * Set and verify collection for an NFT
 */
export async function setAndVerifyCollection(
  mint: string,
  collection: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const collectionPubkey = new PublicKey(collection)
  const metadataAddress = getMetadataAddress(mintPubkey)
  const collectionMetadataAddress = getMetadataAddress(collectionPubkey)

  // Get collection master edition
  const [collectionMasterEdition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      collectionPubkey.toBuffer(),
      Buffer.from('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )

  // SetAndVerifyCollection instruction - discriminator: 25
  const data = Buffer.alloc(1)
  data.writeUInt8(25, 0)

  const instruction: TransactionInstruction = {
    keys: [
      { pubkey: metadataAddress, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: false, isWritable: false },
      { pubkey: collectionPubkey, isSigner: false, isWritable: false },
      { pubkey: collectionMetadataAddress, isSigner: false, isWritable: false },
      { pubkey: collectionMasterEdition, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}
