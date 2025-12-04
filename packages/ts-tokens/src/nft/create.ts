/**
 * NFT Creation
 *
 * Create single NFTs and collections using raw Solana program instructions.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMintLen,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import type {
  TokenConfig,
  CreateNFTOptions,
  CreateCollectionOptions,
  NFTResult,
  CollectionResult,
  TransactionOptions,
} from '../types'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'
import { getStorageAdapter } from '../storage'

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
 * Get master edition PDA
 */
function getMasterEditionAddress(mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )
  return address
}

/**
 * Get collection authority record PDA
 */
function getCollectionAuthorityRecordAddress(
  mint: PublicKey,
  authority: PublicKey
): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('collection_authority'),
      authority.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )
  return address
}

/**
 * Create metadata instruction for NFT
 */
function createMetadataInstruction(
  metadata: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  payer: PublicKey,
  updateAuthority: PublicKey,
  name: string,
  symbol: string,
  uri: string,
  sellerFeeBasisPoints: number,
  creators: Array<{ address: PublicKey; verified: boolean; share: number }> | null,
  collection: { key: PublicKey; verified: boolean } | null,
  isMutable: boolean
): TransactionInstruction {
  // CreateMetadataAccountV3 instruction
  const data = serializeCreateMetadataV3({
    name,
    symbol,
    uri,
    sellerFeeBasisPoints,
    creators,
    collection,
    uses: null,
    isMutable,
    collectionDetails: null,
  })

  return {
    keys: [
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: mintAuthority, isSigner: true, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: updateAuthority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  }
}

/**
 * Create master edition instruction
 */
function createMasterEditionInstruction(
  edition: PublicKey,
  mint: PublicKey,
  updateAuthority: PublicKey,
  mintAuthority: PublicKey,
  payer: PublicKey,
  metadata: PublicKey,
  maxSupply: bigint | null
): TransactionInstruction {
  // CreateMasterEditionV3 instruction discriminator: 17
  const data = Buffer.alloc(10)
  data.writeUInt8(17, 0) // Discriminator

  // Max supply option
  if (maxSupply !== null) {
    data.writeUInt8(1, 1) // Some
    data.writeBigUInt64LE(maxSupply, 2)
  } else {
    data.writeUInt8(0, 1) // None
  }

  return {
    keys: [
      { pubkey: edition, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: updateAuthority, isSigner: true, isWritable: false },
      { pubkey: mintAuthority, isSigner: true, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  }
}

/**
 * Serialize CreateMetadataAccountV3 data
 */
function serializeCreateMetadataV3(params: {
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints: number
  creators: Array<{ address: PublicKey; verified: boolean; share: number }> | null
  collection: { key: PublicKey; verified: boolean } | null
  uses: null
  isMutable: boolean
  collectionDetails: null
}): Buffer {
  const nameBytes = Buffer.from(params.name.slice(0, 32))
  const symbolBytes = Buffer.from(params.symbol.slice(0, 10))
  const uriBytes = Buffer.from(params.uri.slice(0, 200))

  // Calculate size
  let size = 1 + // discriminator
    4 + nameBytes.length +
    4 + symbolBytes.length +
    4 + uriBytes.length +
    2 + // seller fee
    1 + // creators option
    1 + // collection option
    1 + // uses option
    1 + // is_mutable
    1   // collection_details option

  if (params.creators) {
    size += 4 + params.creators.length * 34 // vec length + (pubkey + verified + share)
  }
  if (params.collection) {
    size += 33 // pubkey + verified
  }

  const buffer = Buffer.alloc(size)
  let offset = 0

  // Discriminator for CreateMetadataAccountV3
  buffer.writeUInt8(33, offset)
  offset += 1

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
  buffer.writeUInt16LE(params.sellerFeeBasisPoints, offset)
  offset += 2

  // Creators
  if (params.creators && params.creators.length > 0) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    buffer.writeUInt32LE(params.creators.length, offset)
    offset += 4
    for (const creator of params.creators) {
      creator.address.toBuffer().copy(buffer, offset)
      offset += 32
      buffer.writeUInt8(creator.verified ? 1 : 0, offset)
      offset += 1
      buffer.writeUInt8(creator.share, offset)
      offset += 1
    }
  } else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  // Collection
  if (params.collection) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    params.collection.key.toBuffer().copy(buffer, offset)
    offset += 32
    buffer.writeUInt8(params.collection.verified ? 1 : 0, offset)
    offset += 1
  } else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  // Uses (None)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Is mutable
  buffer.writeUInt8(params.isMutable ? 1 : 0, offset)
  offset += 1

  // Collection details (None)
  buffer.writeUInt8(0, offset)

  return buffer.slice(0, offset + 1)
}

/**
 * Create a single NFT
 */
export async function createNFT(
  options: CreateNFTOptions,
  config: TokenConfig
): Promise<NFTResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  // Generate mint keypair
  const mintKeypair = Keypair.generate()
  const mint = mintKeypair.publicKey

  // Upload metadata if provided as object
  let metadataUri = options.uri
  if (!metadataUri && options.metadata) {
    const storage = getStorageAdapter(config.storageProvider || 'arweave', config)
    const result = await storage.uploadJson(options.metadata)
    metadataUri = result.url
  }

  if (!metadataUri) {
    throw new Error('Either uri or metadata must be provided')
  }

  // Calculate addresses
  const metadataAddress = getMetadataAddress(mint)
  const masterEditionAddress = getMasterEditionAddress(mint)
  const ata = await getAssociatedTokenAddress(mint, payer.publicKey)

  // Build instructions
  const instructions: TransactionInstruction[] = []

  // 1. Create mint account
  const mintLen = getMintLen([])
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen)

  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    })
  )

  // 2. Initialize mint (0 decimals for NFT)
  instructions.push(
    createInitializeMintInstruction(
      mint,
      0, // NFTs have 0 decimals
      payer.publicKey,
      payer.publicKey,
      TOKEN_PROGRAM_ID
    )
  )

  // 3. Create ATA
  instructions.push(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      payer.publicKey,
      mint
    )
  )

  // 4. Mint 1 token
  instructions.push(
    createMintToInstruction(
      mint,
      ata,
      payer.publicKey,
      1n
    )
  )

  // 5. Create metadata
  const creators = options.creators?.map(c => ({
    address: new PublicKey(c.address),
    verified: c.address === payer.publicKey.toBase58(), // Only creator can be verified
    share: c.share,
  })) || [{ address: payer.publicKey, verified: true, share: 100 }]

  const collection = options.collection
    ? { key: new PublicKey(options.collection), verified: false }
    : null

  instructions.push(
    createMetadataInstruction(
      metadataAddress,
      mint,
      payer.publicKey,
      payer.publicKey,
      payer.publicKey,
      options.name,
      options.symbol || '',
      metadataUri,
      options.sellerFeeBasisPoints || 0,
      creators,
      collection,
      options.isMutable ?? true
    )
  )

  // 6. Create master edition
  instructions.push(
    createMasterEditionInstruction(
      masterEditionAddress,
      mint,
      payer.publicKey,
      payer.publicKey,
      payer.publicKey,
      metadataAddress,
      options.maxSupply !== undefined ? BigInt(options.maxSupply) : 0n
    )
  )

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options.options
  )

  transaction.partialSign(mintKeypair)
  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options.options)

  return {
    mint: mint.toBase58(),
    metadata: metadataAddress.toBase58(),
    masterEdition: masterEditionAddress.toBase58(),
    signature: result.signature,
    uri: metadataUri,
  }
}

/**
 * Create an NFT collection
 */
export async function createCollection(
  options: CreateCollectionOptions,
  config: TokenConfig
): Promise<CollectionResult> {
  // A collection is just an NFT with collection details
  const result = await createNFT(
    {
      name: options.name,
      symbol: options.symbol,
      uri: options.uri,
      metadata: options.metadata,
      sellerFeeBasisPoints: options.sellerFeeBasisPoints || 0,
      creators: options.creators,
      isMutable: options.isMutable ?? true,
      maxSupply: 0, // Collections have 0 max supply
      options: options.options,
    },
    config
  )

  return {
    mint: result.mint,
    metadata: result.metadata,
    masterEdition: result.masterEdition,
    signature: result.signature,
    uri: result.uri,
  }
}

/**
 * Simple NFT creation helper
 */
export async function mintNFT(
  name: string,
  uri: string,
  config: TokenConfig
): Promise<NFTResult> {
  return createNFT({ name, uri }, config)
}
