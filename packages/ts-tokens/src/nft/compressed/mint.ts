/**
 * Compressed NFT Minting
 *
 * Mint compressed NFTs to Merkle trees.
 */

import type {
  TransactionInstruction,
} from '@solana/web3.js'
import type { TokenConfig, TransactionOptions } from '../../types'
import {
  PublicKey,
  SystemProgram,
} from '@solana/web3.js'
import { createConnection } from '../../drivers/solana/connection'
import { buildTransaction, sendAndConfirmTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'

/**
 * Bubblegum Program ID
 */
const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY')

/**
 * SPL Account Compression Program ID
 */
const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK')

/**
 * SPL Noop Program ID
 */
const SPL_NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV')

/**
 * Token Metadata Program ID
 */
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Compressed NFT metadata
 */
export interface CompressedNFTMetadata {
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints: number
  creators?: Array<{ address: string, verified: boolean, share: number }>
  collection?: { key: string, verified: boolean }
  isMutable?: boolean
}

/**
 * Mint compressed NFT options
 */
export interface MintCompressedNFTOptions {
  tree: string
  metadata: CompressedNFTMetadata
  leafOwner?: string
  leafDelegate?: string
  options?: TransactionOptions
}

/**
 * Compressed NFT result
 */
export interface CompressedNFTResult {
  signature: string
  leafIndex: number
  assetId: string
}

/**
 * Mint a compressed NFT
 */
export async function mintCompressedNFT(
  mintOptions: MintCompressedNFTOptions,
  tokenConfig: TokenConfig,
): Promise<CompressedNFTResult> {
  const connection = createConnection(tokenConfig)
  const payer = loadWallet(tokenConfig)

  const treePubkey = new PublicKey(mintOptions.tree)
  const leafOwner = mintOptions.leafOwner
    ? new PublicKey(mintOptions.leafOwner)
    : payer.publicKey
  const leafDelegate = mintOptions.leafDelegate
    ? new PublicKey(mintOptions.leafDelegate)
    : leafOwner

  // Get tree authority PDA
  const [treeAuthority] = PublicKey.findProgramAddressSync(
    [treePubkey.toBuffer()],
    BUBBLEGUM_PROGRAM_ID,
  )

  // Get bubblegum signer PDA
  const [bubblegumSigner] = PublicKey.findProgramAddressSync(
    [Buffer.from('collection_cpi')],
    BUBBLEGUM_PROGRAM_ID,
  )

  // Serialize metadata
  const metadataArgs = serializeMetadataArgs(mintOptions.metadata)

  // Build mint instruction
  const mintData = Buffer.alloc(1 + metadataArgs.length)
  mintData.writeUInt8(0, 0) // MintV1 discriminator
  metadataArgs.copy(mintData, 1)

  const keys = [
    { pubkey: treeAuthority, isSigner: false, isWritable: true },
    { pubkey: leafOwner, isSigner: false, isWritable: false },
    { pubkey: leafDelegate, isSigner: false, isWritable: false },
    { pubkey: treePubkey, isSigner: false, isWritable: true },
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  // Add collection accounts if specified
  if (mintOptions.metadata.collection) {
    const collectionMint = new PublicKey(mintOptions.metadata.collection.key)
    const [collectionMetadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
    const [collectionEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )

    keys.push(
      { pubkey: collectionMetadata, isSigner: false, isWritable: true },
      { pubkey: collectionMint, isSigner: false, isWritable: false },
      { pubkey: collectionEdition, isSigner: false, isWritable: false },
      { pubkey: bubblegumSigner, isSigner: false, isWritable: false },
      { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    )
  }

  const instruction: TransactionInstruction = {
    keys,
    programId: BUBBLEGUM_PROGRAM_ID,
    data: mintData,
  }

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    mintOptions.options,
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, mintOptions.options)

  // Get leaf index from transaction logs (simplified)
  // In production, parse the actual logs
  const leafIndex = 0 // Would be parsed from logs

  // Calculate asset ID
  const assetId = await getAssetId(treePubkey, leafIndex)

  return {
    signature: result.signature,
    leafIndex,
    assetId: assetId.toBase58(),
  }
}

/**
 * Mint multiple compressed NFTs in batch
 */
export async function mintCompressedNFTBatch(
  tree: string,
  items: CompressedNFTMetadata[],
  tokenConfig: TokenConfig,
  options?: TransactionOptions,
): Promise<{ signatures: string[], count: number }> {
  const signatures: string[] = []

  // Mint in batches to avoid transaction size limits
  const BATCH_SIZE = 5

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)

    for (const metadata of batch) {
      const result = await mintCompressedNFT(
        { tree, metadata, options },
        tokenConfig,
      )
      signatures.push(result.signature)
    }
  }

  return {
    signatures,
    count: items.length,
  }
}

/**
 * Get asset ID from tree and leaf index
 */
async function getAssetId(tree: PublicKey, leafIndex: number): Promise<PublicKey> {
  const [assetId] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('asset'),
      tree.toBuffer(),
      Buffer.from(new Uint8Array(new BigUint64Array([BigInt(leafIndex)]).buffer)),
    ],
    BUBBLEGUM_PROGRAM_ID,
  )
  return assetId
}

/**
 * Serialize metadata args for Bubblegum
 */
function serializeMetadataArgs(metadata: CompressedNFTMetadata): Buffer {
  const nameBytes = Buffer.from(metadata.name.slice(0, 32))
  const symbolBytes = Buffer.from(metadata.symbol.slice(0, 10))
  const uriBytes = Buffer.from(metadata.uri.slice(0, 200))

  // Calculate size
  let size = 4 + nameBytes.length
    + 4 + symbolBytes.length
    + 4 + uriBytes.length
    + 2 // seller fee
    + 1 // primary sale happened
    + 1 // is mutable
    + 1 // edition nonce option
    + 1 // token standard option
    + 1 // collection option
    + 1 // uses option
    + 1 // token program version
    + 1 // creators option

  if (metadata.creators) {
    size += 4 + metadata.creators.length * 34
  }
  if (metadata.collection) {
    size += 33
  }

  const buffer = Buffer.alloc(size)
  let offset = 0

  // Name
  buffer.writeUInt32LE(nameBytes.length, offset)
  offset += 4
  nameBytes.copy(buffer, offset)
  offset += nameBytes.length

  // Symbol
  buffer.writeUInt32LE(symbolBytes.length, offset)
  offset += 4
  symbolBytes.copy(buffer, offset)
  offset += symbolBytes.length

  // URI
  buffer.writeUInt32LE(uriBytes.length, offset)
  offset += 4
  uriBytes.copy(buffer, offset)
  offset += uriBytes.length

  // Seller fee basis points
  buffer.writeUInt16LE(metadata.sellerFeeBasisPoints, offset)
  offset += 2

  // Primary sale happened
  buffer.writeUInt8(0, offset)
  offset += 1

  // Is mutable
  buffer.writeUInt8(metadata.isMutable !== false ? 1 : 0, offset)
  offset += 1

  // Edition nonce (None)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Token standard (None - defaults to NonFungible)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Collection
  if (metadata.collection) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    new PublicKey(metadata.collection.key).toBuffer().copy(buffer, offset)
    offset += 32
    buffer.writeUInt8(metadata.collection.verified ? 1 : 0, offset)
    offset += 1
  }
  else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  // Uses (None)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Token program version
  buffer.writeUInt8(0, offset) // Original
  offset += 1

  // Creators
  if (metadata.creators && metadata.creators.length > 0) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    buffer.writeUInt32LE(metadata.creators.length, offset)
    offset += 4
    for (const creator of metadata.creators) {
      new PublicKey(creator.address).toBuffer().copy(buffer, offset)
      offset += 32
      buffer.writeUInt8(creator.verified ? 1 : 0, offset)
      offset += 1
      buffer.writeUInt8(creator.share, offset)
      offset += 1
    }
  }
  else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  return buffer.slice(0, offset)
}
