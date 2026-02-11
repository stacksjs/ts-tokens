/**
 * Token Metadata Program Instructions
 *
 * Raw instruction builders for the Token Metadata Program.
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { findMetadataPda, findMasterEditionPda } from './pda'
import type {
  CreateMetadataAccountV3Options,
  UpdateMetadataAccountV2Options,
  CreateMasterEditionV3Options,
  VerifyCollectionOptions,
  DataV2,
  Creator,
} from './types'

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Instruction discriminators
enum MetadataInstruction {
  CreateMetadataAccountV3 = 33,
  UpdateMetadataAccountV2 = 15,
  CreateMasterEditionV3 = 17,
  VerifyCollection = 18,
  UnverifyCollection = 22,
  SetAndVerifyCollection = 25,
  VerifyCreator = 4,
  BurnNft = 29,
  MintNewEditionFromMasterEditionViaToken = 11,
  VerifySizedCollectionItem = 30,
  BurnEditionNft = 37,
}

/**
 * Create a CreateMetadataAccountV3 instruction
 */
export function createMetadataAccountV3(
  options: CreateMetadataAccountV3Options
): TransactionInstruction {
  const [metadata] = findMetadataPda(options.mint)

  const keys = [
    { pubkey: metadata, isSigner: false, isWritable: true },
    { pubkey: options.mint, isSigner: false, isWritable: false },
    { pubkey: options.mintAuthority, isSigner: true, isWritable: false },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    { pubkey: options.updateAuthority, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ]

  const data = serializeCreateMetadataV3(options)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

/**
 * Create an UpdateMetadataAccountV2 instruction
 */
export function updateMetadataAccountV2(
  options: UpdateMetadataAccountV2Options
): TransactionInstruction {
  const keys = [
    { pubkey: options.metadata, isSigner: false, isWritable: true },
    { pubkey: options.updateAuthority, isSigner: true, isWritable: false },
  ]

  const data = serializeUpdateMetadataV2(options)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

/**
 * Create a CreateMasterEditionV3 instruction
 */
export function createMasterEditionV3(
  options: CreateMasterEditionV3Options
): TransactionInstruction {
  const [metadata] = findMetadataPda(options.mint)
  const [masterEdition] = findMasterEditionPda(options.mint)

  const keys = [
    { pubkey: masterEdition, isSigner: false, isWritable: true },
    { pubkey: options.mint, isSigner: false, isWritable: true },
    { pubkey: options.updateAuthority, isSigner: true, isWritable: false },
    { pubkey: options.mintAuthority, isSigner: true, isWritable: false },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    { pubkey: metadata, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ]

  const data = serializeCreateMasterEditionV3(options)

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

/**
 * Create a VerifyCollection instruction
 */
export function verifyCollection(options: VerifyCollectionOptions): TransactionInstruction {
  const keys = [
    { pubkey: options.metadata, isSigner: false, isWritable: true },
    { pubkey: options.collectionAuthority, isSigner: true, isWritable: true },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    { pubkey: options.collectionMint, isSigner: false, isWritable: false },
    { pubkey: options.collection, isSigner: false, isWritable: false },
    { pubkey: options.collectionMasterEdition, isSigner: false, isWritable: false },
  ]

  const data = Buffer.from([MetadataInstruction.VerifyCollection])

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

/**
 * Create an UnverifyCollection instruction
 */
export function unverifyCollection(options: VerifyCollectionOptions): TransactionInstruction {
  const keys = [
    { pubkey: options.metadata, isSigner: false, isWritable: true },
    { pubkey: options.collectionAuthority, isSigner: true, isWritable: true },
    { pubkey: options.collectionMint, isSigner: false, isWritable: false },
    { pubkey: options.collection, isSigner: false, isWritable: false },
    { pubkey: options.collectionMasterEdition, isSigner: false, isWritable: false },
  ]

  const data = Buffer.from([MetadataInstruction.UnverifyCollection])

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

/**
 * Create a SetAndVerifyCollection instruction
 */
export function setAndVerifyCollection(options: VerifyCollectionOptions): TransactionInstruction {
  const keys = [
    { pubkey: options.metadata, isSigner: false, isWritable: true },
    { pubkey: options.collectionAuthority, isSigner: true, isWritable: true },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    { pubkey: options.collectionAuthority, isSigner: false, isWritable: false }, // update authority
    { pubkey: options.collectionMint, isSigner: false, isWritable: false },
    { pubkey: options.collection, isSigner: false, isWritable: false },
    { pubkey: options.collectionMasterEdition, isSigner: false, isWritable: false },
  ]

  const data = Buffer.from([MetadataInstruction.SetAndVerifyCollection])

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

/**
 * Create a VerifyCreator instruction
 */
export function verifyCreator(
  metadata: PublicKey,
  creator: PublicKey
): TransactionInstruction {
  const keys = [
    { pubkey: metadata, isSigner: false, isWritable: true },
    { pubkey: creator, isSigner: true, isWritable: false },
  ]

  const data = Buffer.from([MetadataInstruction.VerifyCreator])

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

/**
 * Create a BurnNft instruction
 */
export function burnNft(
  metadata: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  tokenAccount: PublicKey,
  masterEdition: PublicKey,
  collectionMetadata?: PublicKey
): TransactionInstruction {
  const keys = [
    { pubkey: metadata, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    { pubkey: masterEdition, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  if (collectionMetadata) {
    keys.push({ pubkey: collectionMetadata, isSigner: false, isWritable: true })
  }

  const data = Buffer.from([MetadataInstruction.BurnNft])

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

/**
 * Print a new edition from a master edition via token ownership
 *
 * Creates a numbered edition NFT from an existing master edition.
 * The caller must own the master edition token to print.
 */
export function mintNewEditionFromMasterEditionViaToken(params: {
  /** New edition metadata PDA */
  newMetadata: PublicKey
  /** New edition PDA */
  newEdition: PublicKey
  /** Master edition account (original) */
  masterEdition: PublicKey
  /** New mint account for the edition */
  newMint: PublicKey
  /** Edition mark PDA */
  editionMarkPda: PublicKey
  /** Authority: mint authority of new mint */
  newMintAuthority: PublicKey
  /** Payer for transaction fees */
  payer: PublicKey
  /** Owner of the master edition token */
  tokenAccountOwner: PublicKey
  /** Token account holding the master edition token */
  tokenAccount: PublicKey
  /** Update authority of the new metadata */
  newMetadataUpdateAuthority: PublicKey
  /** Metadata of the master edition */
  metadata: PublicKey
  /** Edition number to mint */
  editionNumber: bigint
}): TransactionInstruction {
  const keys = [
    { pubkey: params.newMetadata, isSigner: false, isWritable: true },
    { pubkey: params.newEdition, isSigner: false, isWritable: true },
    { pubkey: params.masterEdition, isSigner: false, isWritable: true },
    { pubkey: params.newMint, isSigner: false, isWritable: true },
    { pubkey: params.editionMarkPda, isSigner: false, isWritable: true },
    { pubkey: params.newMintAuthority, isSigner: true, isWritable: false },
    { pubkey: params.payer, isSigner: true, isWritable: true },
    { pubkey: params.tokenAccountOwner, isSigner: true, isWritable: false },
    { pubkey: params.tokenAccount, isSigner: false, isWritable: false },
    { pubkey: params.newMetadataUpdateAuthority, isSigner: false, isWritable: false },
    { pubkey: params.metadata, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ]

  const editionBuffer = Buffer.alloc(8)
  editionBuffer.writeBigUInt64LE(params.editionNumber)

  const data = Buffer.concat([
    Buffer.from([MetadataInstruction.MintNewEditionFromMasterEditionViaToken]),
    editionBuffer,
  ])

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

/**
 * Verify a sized collection item
 *
 * Verifies that an NFT belongs to a sized collection and increments
 * the collection size counter. Use this instead of verifyCollection
 * when working with sized collections (CollectionDetails.size).
 */
export function verifySizedCollectionItem(params: {
  /** NFT metadata account to verify */
  metadata: PublicKey
  /** Collection authority (signer) */
  collectionAuthority: PublicKey
  /** Payer for transaction fees */
  payer: PublicKey
  /** Collection mint address */
  collectionMint: PublicKey
  /** Collection metadata account */
  collection: PublicKey
  /** Collection master edition account */
  collectionMasterEdition: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: params.metadata, isSigner: false, isWritable: true },
    { pubkey: params.collectionAuthority, isSigner: true, isWritable: true },
    { pubkey: params.payer, isSigner: true, isWritable: true },
    { pubkey: params.collectionMint, isSigner: false, isWritable: false },
    { pubkey: params.collection, isSigner: false, isWritable: true },
    { pubkey: params.collectionMasterEdition, isSigner: false, isWritable: false },
  ]

  const data = Buffer.from([MetadataInstruction.VerifySizedCollectionItem])

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

/**
 * Burn an edition NFT
 *
 * Burns a printed edition NFT and its associated accounts.
 * This decrements the master edition supply counter.
 */
export function burnEditionNft(params: {
  /** Edition metadata account */
  metadata: PublicKey
  /** Owner of the edition (signer) */
  owner: PublicKey
  /** Print edition mint */
  printEditionMint: PublicKey
  /** Master edition mint */
  masterEditionMint: PublicKey
  /** Print edition token account */
  printEditionTokenAccount: PublicKey
  /** Master edition token account */
  masterEditionTokenAccount: PublicKey
  /** Master edition account */
  masterEditionAccount: PublicKey
  /** Print edition account */
  printEditionAccount: PublicKey
  /** Edition marker PDA */
  editionMarkerPda: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: params.metadata, isSigner: false, isWritable: true },
    { pubkey: params.owner, isSigner: true, isWritable: true },
    { pubkey: params.printEditionMint, isSigner: false, isWritable: true },
    { pubkey: params.masterEditionMint, isSigner: false, isWritable: false },
    { pubkey: params.printEditionTokenAccount, isSigner: false, isWritable: true },
    { pubkey: params.masterEditionTokenAccount, isSigner: false, isWritable: false },
    { pubkey: params.masterEditionAccount, isSigner: false, isWritable: true },
    { pubkey: params.printEditionAccount, isSigner: false, isWritable: true },
    { pubkey: params.editionMarkerPda, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  const data = Buffer.from([MetadataInstruction.BurnEditionNft])

  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  })
}

// Serialization helpers

function serializeCreateMetadataV3(options: CreateMetadataAccountV3Options): Buffer {
  const dataBuffer = serializeDataV2(options.data)
  const isMutableByte = options.isMutable ? 1 : 0

  // Collection details (optional)
  let collectionDetailsBuffer: Buffer
  if (options.collectionDetails) {
    const sizeBuffer = Buffer.alloc(8)
    sizeBuffer.writeBigUInt64LE(options.collectionDetails.size)
    collectionDetailsBuffer = Buffer.concat([Buffer.from([1, 0]), sizeBuffer]) // Some(V1 { size })
  } else {
    collectionDetailsBuffer = Buffer.from([0]) // None
  }

  return Buffer.concat([
    Buffer.from([MetadataInstruction.CreateMetadataAccountV3]),
    dataBuffer,
    Buffer.from([isMutableByte]),
    collectionDetailsBuffer,
  ])
}

function serializeUpdateMetadataV2(options: UpdateMetadataAccountV2Options): Buffer {
  const parts: Buffer[] = [Buffer.from([MetadataInstruction.UpdateMetadataAccountV2])]

  // Data (optional)
  if (options.data) {
    parts.push(Buffer.from([1])) // Some
    parts.push(serializeDataV2(options.data))
  } else {
    parts.push(Buffer.from([0])) // None
  }

  // New update authority (optional)
  if (options.newUpdateAuthority) {
    parts.push(Buffer.from([1])) // Some
    parts.push(options.newUpdateAuthority.toBuffer())
  } else {
    parts.push(Buffer.from([0])) // None
  }

  // Primary sale happened (optional)
  if (options.primarySaleHappened !== null) {
    parts.push(Buffer.from([1])) // Some
    parts.push(Buffer.from([options.primarySaleHappened ? 1 : 0]))
  } else {
    parts.push(Buffer.from([0])) // None
  }

  // Is mutable (optional)
  if (options.isMutable !== null) {
    parts.push(Buffer.from([1])) // Some
    parts.push(Buffer.from([options.isMutable ? 1 : 0]))
  } else {
    parts.push(Buffer.from([0])) // None
  }

  return Buffer.concat(parts)
}

function serializeCreateMasterEditionV3(options: CreateMasterEditionV3Options): Buffer {
  const parts: Buffer[] = [Buffer.from([MetadataInstruction.CreateMasterEditionV3])]

  // Max supply (optional)
  if (options.maxSupply !== null) {
    parts.push(Buffer.from([1])) // Some
    const maxSupplyBuffer = Buffer.alloc(8)
    maxSupplyBuffer.writeBigUInt64LE(options.maxSupply)
    parts.push(maxSupplyBuffer)
  } else {
    parts.push(Buffer.from([0])) // None
  }

  return Buffer.concat(parts)
}

function serializeDataV2(data: DataV2): Buffer {
  const parts: Buffer[] = []

  // Name
  const nameBuffer = Buffer.from(data.name)
  const nameLenBuffer = Buffer.alloc(4)
  nameLenBuffer.writeUInt32LE(nameBuffer.length)
  parts.push(nameLenBuffer, nameBuffer)

  // Symbol
  const symbolBuffer = Buffer.from(data.symbol)
  const symbolLenBuffer = Buffer.alloc(4)
  symbolLenBuffer.writeUInt32LE(symbolBuffer.length)
  parts.push(symbolLenBuffer, symbolBuffer)

  // URI
  const uriBuffer = Buffer.from(data.uri)
  const uriLenBuffer = Buffer.alloc(4)
  uriLenBuffer.writeUInt32LE(uriBuffer.length)
  parts.push(uriLenBuffer, uriBuffer)

  // Seller fee basis points
  const feeBuffer = Buffer.alloc(2)
  feeBuffer.writeUInt16LE(data.sellerFeeBasisPoints)
  parts.push(feeBuffer)

  // Creators (optional)
  if (data.creators && data.creators.length > 0) {
    parts.push(Buffer.from([1])) // Some
    const creatorsLenBuffer = Buffer.alloc(4)
    creatorsLenBuffer.writeUInt32LE(data.creators.length)
    parts.push(creatorsLenBuffer)
    for (const creator of data.creators) {
      parts.push(serializeCreator(creator))
    }
  } else {
    parts.push(Buffer.from([0])) // None
  }

  // Collection (optional)
  if (data.collection) {
    parts.push(Buffer.from([1])) // Some
    parts.push(Buffer.from([data.collection.verified ? 1 : 0]))
    parts.push(data.collection.key.toBuffer())
  } else {
    parts.push(Buffer.from([0])) // None
  }

  // Uses (optional)
  if (data.uses) {
    parts.push(Buffer.from([1])) // Some
    parts.push(Buffer.from([data.uses.useMethod]))
    const remainingBuffer = Buffer.alloc(8)
    remainingBuffer.writeBigUInt64LE(data.uses.remaining)
    parts.push(remainingBuffer)
    const totalBuffer = Buffer.alloc(8)
    totalBuffer.writeBigUInt64LE(data.uses.total)
    parts.push(totalBuffer)
  } else {
    parts.push(Buffer.from([0])) // None
  }

  return Buffer.concat(parts)
}

function serializeCreator(creator: Creator): Buffer {
  return Buffer.concat([
    creator.address.toBuffer(),
    Buffer.from([creator.verified ? 1 : 0]),
    Buffer.from([creator.share]),
  ])
}
