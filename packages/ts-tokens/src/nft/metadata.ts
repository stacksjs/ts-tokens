/**
 * NFT Metadata Management
 *
 * Update and fetch NFT metadata.
 */

import type { TransactionInstruction } from '@solana/web3.js';
import { Connection, PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions, NFTMetadata } from '../types'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'

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
 * Update NFT metadata
 */
export async function updateNFTMetadata(
  mint: string,
  updates: {
    name?: string
    symbol?: string
    uri?: string
    sellerFeeBasisPoints?: number
    creators?: Array<{ address: string; share: number }>
    primarySaleHappened?: boolean
    isMutable?: boolean
  },
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const metadataAddress = getMetadataAddress(mintPubkey)

  // Build UpdateMetadataAccountV2 instruction
  // Discriminator: 15
  const data = serializeUpdateMetadataV2(updates, payer.publicKey)

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
 * Serialize UpdateMetadataAccountV2 data
 */
function serializeUpdateMetadataV2(
  updates: {
    name?: string
    symbol?: string
    uri?: string
    sellerFeeBasisPoints?: number
    creators?: Array<{ address: string; share: number }>
    primarySaleHappened?: boolean
    isMutable?: boolean
  },
  updateAuthority: PublicKey
): Buffer {
  // This is a simplified version - full implementation would handle all fields
  const buffer = Buffer.alloc(512)
  let offset = 0

  // Discriminator for UpdateMetadataAccountV2
  buffer.writeUInt8(15, offset)
  offset += 1

  // Data option (Some)
  buffer.writeUInt8(1, offset)
  offset += 1

  // Name
  if (updates.name) {
    const nameBytes = Buffer.from(updates.name.slice(0, 32))
    buffer.writeUInt32LE(nameBytes.length, offset)
    offset += 4
    nameBytes.copy(buffer, offset)
    offset += nameBytes.length
  } else {
    buffer.writeUInt32LE(0, offset)
    offset += 4
  }

  // Symbol
  if (updates.symbol) {
    const symbolBytes = Buffer.from(updates.symbol.slice(0, 10))
    buffer.writeUInt32LE(symbolBytes.length, offset)
    offset += 4
    symbolBytes.copy(buffer, offset)
    offset += symbolBytes.length
  } else {
    buffer.writeUInt32LE(0, offset)
    offset += 4
  }

  // URI
  if (updates.uri) {
    const uriBytes = Buffer.from(updates.uri.slice(0, 200))
    buffer.writeUInt32LE(uriBytes.length, offset)
    offset += 4
    uriBytes.copy(buffer, offset)
    offset += uriBytes.length
  } else {
    buffer.writeUInt32LE(0, offset)
    offset += 4
  }

  // Seller fee basis points
  buffer.writeUInt16LE(updates.sellerFeeBasisPoints || 0, offset)
  offset += 2

  // Creators (None for now - simplified)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Collection (None)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Uses (None)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Update authority option (None - keep existing)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Primary sale happened option
  if (updates.primarySaleHappened !== undefined) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    buffer.writeUInt8(updates.primarySaleHappened ? 1 : 0, offset)
    offset += 1
  } else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  // Is mutable option
  if (updates.isMutable !== undefined) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    buffer.writeUInt8(updates.isMutable ? 1 : 0, offset)
    offset += 1
  } else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  return buffer.slice(0, offset)
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
