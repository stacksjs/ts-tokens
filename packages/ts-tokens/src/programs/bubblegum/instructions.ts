/**
 * Bubblegum Instructions
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { findTreeAuthorityPda, findBubblegumSignerPda } from './pda'
import type {
  CreateTreeOptions,
  MintV1Options,
  MintToCollectionOptions,
  TransferOptions,
  BurnOptions,
  DecompressOptions,
  MetadataArgs,
  Creator,
} from './types'

const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY')
const ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK')
const SPL_NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Instruction discriminators (Anchor style)
const CREATE_TREE_DISCRIMINATOR = Buffer.from([165, 83, 136, 142, 89, 202, 47, 220])
const MINT_V1_DISCRIMINATOR = Buffer.from([145, 98, 192, 118, 184, 147, 118, 104])
const MINT_TO_COLLECTION_V1_DISCRIMINATOR = Buffer.from([153, 18, 178, 47, 197, 158, 86, 15])
const TRANSFER_DISCRIMINATOR = Buffer.from([163, 52, 200, 231, 140, 3, 69, 186])
const BURN_DISCRIMINATOR = Buffer.from([116, 110, 29, 56, 107, 219, 42, 93])
const DECOMPRESS_V1_DISCRIMINATOR = Buffer.from([54, 85, 76, 70, 228, 250, 164, 81])
const DELEGATE_DISCRIMINATOR = Buffer.from([90, 147, 75, 178, 85, 88, 4, 137])
const REDEEM_DISCRIMINATOR = Buffer.from([184, 12, 86, 149, 70, 196, 97, 225])
const CANCEL_REDEEM_DISCRIMINATOR = Buffer.from([111, 76, 232, 50, 39, 175, 48, 101])

/**
 * Create a Merkle tree for compressed NFTs
 */
export function createTree(options: CreateTreeOptions): TransactionInstruction {
  const keys = [
    { pubkey: options.merkleTree, isSigner: false, isWritable: true },
    { pubkey: options.treeAuthority, isSigner: false, isWritable: true },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    { pubkey: options.treeCreator, isSigner: true, isWritable: false },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  const data = Buffer.concat([
    CREATE_TREE_DISCRIMINATOR,
    Buffer.from([options.maxDepth]),
    Buffer.from([options.maxBufferSize]),
    Buffer.from([options.public ? 1 : 0]),
  ])

  return new TransactionInstruction({
    keys,
    programId: BUBBLEGUM_PROGRAM_ID,
    data,
  })
}

/**
 * Mint a compressed NFT
 */
export function mintV1(options: MintV1Options): TransactionInstruction {
  const keys = [
    { pubkey: options.treeAuthority, isSigner: false, isWritable: true },
    { pubkey: options.leafOwner, isSigner: false, isWritable: false },
    { pubkey: options.leafDelegate, isSigner: false, isWritable: false },
    { pubkey: options.merkleTree, isSigner: false, isWritable: true },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    { pubkey: options.treeDelegate, isSigner: true, isWritable: false },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  const data = Buffer.concat([
    MINT_V1_DISCRIMINATOR,
    serializeMetadataArgs(options.metadata),
  ])

  return new TransactionInstruction({
    keys,
    programId: BUBBLEGUM_PROGRAM_ID,
    data,
  })
}

/**
 * Mint a compressed NFT to a collection
 */
export function mintToCollectionV1(options: MintToCollectionOptions): TransactionInstruction {
  const [bubblegumSigner] = findBubblegumSignerPda()

  const keys = [
    { pubkey: options.treeAuthority, isSigner: false, isWritable: true },
    { pubkey: options.leafOwner, isSigner: false, isWritable: false },
    { pubkey: options.leafDelegate, isSigner: false, isWritable: false },
    { pubkey: options.merkleTree, isSigner: false, isWritable: true },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    { pubkey: options.treeDelegate, isSigner: true, isWritable: false },
    { pubkey: options.collectionAuthority, isSigner: true, isWritable: false },
    { pubkey: options.collectionAuthorityRecordPda || BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: options.collectionMint, isSigner: false, isWritable: false },
    { pubkey: options.collectionMetadata, isSigner: false, isWritable: true },
    { pubkey: options.collectionMasterEdition, isSigner: false, isWritable: false },
    { pubkey: bubblegumSigner, isSigner: false, isWritable: false },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  const data = Buffer.concat([
    MINT_TO_COLLECTION_V1_DISCRIMINATOR,
    serializeMetadataArgs(options.metadata),
  ])

  return new TransactionInstruction({
    keys,
    programId: BUBBLEGUM_PROGRAM_ID,
    data,
  })
}

/**
 * Transfer a compressed NFT
 */
export function transfer(options: TransferOptions): TransactionInstruction {
  const keys = [
    { pubkey: options.treeAuthority, isSigner: false, isWritable: false },
    { pubkey: options.leafOwner, isSigner: true, isWritable: false },
    { pubkey: options.leafDelegate, isSigner: false, isWritable: false },
    { pubkey: options.newLeafOwner, isSigner: false, isWritable: false },
    { pubkey: options.merkleTree, isSigner: false, isWritable: true },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    // Add proof accounts
    ...options.proof.map(p => ({ pubkey: p, isSigner: false, isWritable: false })),
  ]

  const nonceBuffer = Buffer.alloc(8)
  nonceBuffer.writeBigUInt64LE(options.nonce)

  const indexBuffer = Buffer.alloc(4)
  indexBuffer.writeUInt32LE(options.index)

  const data = Buffer.concat([
    TRANSFER_DISCRIMINATOR,
    Buffer.from(options.root),
    Buffer.from(options.dataHash),
    Buffer.from(options.creatorHash),
    nonceBuffer,
    indexBuffer,
  ])

  return new TransactionInstruction({
    keys,
    programId: BUBBLEGUM_PROGRAM_ID,
    data,
  })
}

/**
 * Burn a compressed NFT
 */
export function burn(options: BurnOptions): TransactionInstruction {
  const keys = [
    { pubkey: options.treeAuthority, isSigner: false, isWritable: false },
    { pubkey: options.leafOwner, isSigner: true, isWritable: false },
    { pubkey: options.leafDelegate, isSigner: false, isWritable: false },
    { pubkey: options.merkleTree, isSigner: false, isWritable: true },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    // Add proof accounts
    ...options.proof.map(p => ({ pubkey: p, isSigner: false, isWritable: false })),
  ]

  const nonceBuffer = Buffer.alloc(8)
  nonceBuffer.writeBigUInt64LE(options.nonce)

  const indexBuffer = Buffer.alloc(4)
  indexBuffer.writeUInt32LE(options.index)

  const data = Buffer.concat([
    BURN_DISCRIMINATOR,
    Buffer.from(options.root),
    Buffer.from(options.dataHash),
    Buffer.from(options.creatorHash),
    nonceBuffer,
    indexBuffer,
  ])

  return new TransactionInstruction({
    keys,
    programId: BUBBLEGUM_PROGRAM_ID,
    data,
  })
}

/**
 * Decompress a compressed NFT to a regular NFT
 */
export function decompressV1(options: DecompressOptions): TransactionInstruction {
  const keys = [
    { pubkey: options.treeAuthority, isSigner: false, isWritable: false },
    { pubkey: options.leafOwner, isSigner: true, isWritable: true },
    { pubkey: options.leafDelegate, isSigner: false, isWritable: false },
    { pubkey: options.merkleTree, isSigner: false, isWritable: true },
    { pubkey: options.mint, isSigner: false, isWritable: true },
    { pubkey: options.mintAuthority, isSigner: false, isWritable: false },
    { pubkey: options.metadata, isSigner: false, isWritable: true },
    { pubkey: options.masterEdition, isSigner: false, isWritable: true },
    { pubkey: options.tokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ACCOUNT_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    // Add proof accounts
    ...options.proof.map(p => ({ pubkey: p, isSigner: false, isWritable: false })),
  ]

  const nonceBuffer = Buffer.alloc(8)
  nonceBuffer.writeBigUInt64LE(options.nonce)

  const indexBuffer = Buffer.alloc(4)
  indexBuffer.writeUInt32LE(options.index)

  const data = Buffer.concat([
    DECOMPRESS_V1_DISCRIMINATOR,
    Buffer.from(options.root),
    Buffer.from(options.dataHash),
    Buffer.from(options.creatorHash),
    nonceBuffer,
    indexBuffer,
  ])

  return new TransactionInstruction({
    keys,
    programId: BUBBLEGUM_PROGRAM_ID,
    data,
  })
}

// Serialization helpers

function serializeMetadataArgs(metadata: MetadataArgs): Buffer {
  const parts: Buffer[] = []

  // Name
  const nameBuffer = Buffer.from(metadata.name)
  const nameLenBuffer = Buffer.alloc(4)
  nameLenBuffer.writeUInt32LE(nameBuffer.length)
  parts.push(nameLenBuffer, nameBuffer)

  // Symbol
  const symbolBuffer = Buffer.from(metadata.symbol)
  const symbolLenBuffer = Buffer.alloc(4)
  symbolLenBuffer.writeUInt32LE(symbolBuffer.length)
  parts.push(symbolLenBuffer, symbolBuffer)

  // URI
  const uriBuffer = Buffer.from(metadata.uri)
  const uriLenBuffer = Buffer.alloc(4)
  uriLenBuffer.writeUInt32LE(uriBuffer.length)
  parts.push(uriLenBuffer, uriBuffer)

  // Seller fee basis points
  const feeBuffer = Buffer.alloc(2)
  feeBuffer.writeUInt16LE(metadata.sellerFeeBasisPoints)
  parts.push(feeBuffer)

  // Primary sale happened
  parts.push(Buffer.from([metadata.primarySaleHappened ? 1 : 0]))

  // Is mutable
  parts.push(Buffer.from([metadata.isMutable ? 1 : 0]))

  // Edition nonce (optional)
  if (metadata.editionNonce !== null) {
    parts.push(Buffer.from([1, metadata.editionNonce]))
  } else {
    parts.push(Buffer.from([0]))
  }

  // Token standard (optional)
  if (metadata.tokenStandard !== null) {
    parts.push(Buffer.from([1, metadata.tokenStandard]))
  } else {
    parts.push(Buffer.from([0]))
  }

  // Collection (optional)
  if (metadata.collection) {
    parts.push(Buffer.from([1]))
    parts.push(Buffer.from([metadata.collection.verified ? 1 : 0]))
    parts.push(metadata.collection.key.toBuffer())
  } else {
    parts.push(Buffer.from([0]))
  }

  // Uses (optional)
  if (metadata.uses) {
    parts.push(Buffer.from([1]))
    parts.push(Buffer.from([metadata.uses.useMethod]))
    const remainingBuffer = Buffer.alloc(8)
    remainingBuffer.writeBigUInt64LE(metadata.uses.remaining)
    parts.push(remainingBuffer)
    const totalBuffer = Buffer.alloc(8)
    totalBuffer.writeBigUInt64LE(metadata.uses.total)
    parts.push(totalBuffer)
  } else {
    parts.push(Buffer.from([0]))
  }

  // Token program version
  parts.push(Buffer.from([metadata.tokenProgramVersion]))

  // Creators
  const creatorsLenBuffer = Buffer.alloc(4)
  creatorsLenBuffer.writeUInt32LE(metadata.creators.length)
  parts.push(creatorsLenBuffer)
  for (const creator of metadata.creators) {
    parts.push(serializeCreator(creator))
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
