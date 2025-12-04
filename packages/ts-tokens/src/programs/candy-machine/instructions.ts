/**
 * Candy Machine v3 Instructions
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_SLOT_HASHES_PUBKEY,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import type {
  InitializeCandyMachineOptions,
  AddConfigLinesOptions,
  MintFromCandyMachineOptions,
  UpdateCandyMachineOptions,
  WithdrawOptions,
  CandyMachineData,
  Creator,
  ConfigLine,
} from './types'

const CANDY_MACHINE_PROGRAM_ID = new PublicKey('CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Instruction discriminators (Anchor style)
const INITIALIZE_DISCRIMINATOR = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237])
const ADD_CONFIG_LINES_DISCRIMINATOR = Buffer.from([223, 50, 224, 227, 151, 8, 115, 106])
const MINT_DISCRIMINATOR = Buffer.from([51, 57, 225, 47, 182, 146, 137, 166])
const UPDATE_DISCRIMINATOR = Buffer.from([219, 200, 88, 176, 158, 63, 253, 127])
const WITHDRAW_DISCRIMINATOR = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34])
const SET_AUTHORITY_DISCRIMINATOR = Buffer.from([133, 250, 37, 21, 110, 163, 26, 121])

/**
 * Create an Initialize Candy Machine instruction
 */
export function initializeCandyMachine(
  options: InitializeCandyMachineOptions
): TransactionInstruction {
  const keys = [
    { pubkey: options.candyMachine, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: false, isWritable: false },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    { pubkey: options.collectionMint, isSigner: false, isWritable: false },
    { pubkey: options.collectionUpdateAuthority, isSigner: true, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ]

  const data = Buffer.concat([
    INITIALIZE_DISCRIMINATOR,
    serializeCandyMachineData(options.data),
    Buffer.from([options.tokenStandard]),
  ])

  return new TransactionInstruction({
    keys,
    programId: CANDY_MACHINE_PROGRAM_ID,
    data,
  })
}

/**
 * Create an Add Config Lines instruction
 */
export function addConfigLines(options: AddConfigLinesOptions): TransactionInstruction {
  const keys = [
    { pubkey: options.candyMachine, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: true, isWritable: false },
  ]

  const indexBuffer = Buffer.alloc(4)
  indexBuffer.writeUInt32LE(options.index)

  const configLinesBuffer = serializeConfigLines(options.configLines)

  const data = Buffer.concat([
    ADD_CONFIG_LINES_DISCRIMINATOR,
    indexBuffer,
    configLinesBuffer,
  ])

  return new TransactionInstruction({
    keys,
    programId: CANDY_MACHINE_PROGRAM_ID,
    data,
  })
}

/**
 * Create a Mint instruction
 */
export function mintFromCandyMachine(
  options: MintFromCandyMachineOptions
): TransactionInstruction {
  const keys = [
    { pubkey: options.candyMachine, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: false, isWritable: false },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    { pubkey: options.nftMint, isSigner: true, isWritable: true },
    { pubkey: options.nftMintAuthority, isSigner: true, isWritable: false },
    { pubkey: options.nftMetadata, isSigner: false, isWritable: true },
    { pubkey: options.nftMasterEdition, isSigner: false, isWritable: true },
    { pubkey: options.collectionMint, isSigner: false, isWritable: false },
    { pubkey: options.collectionMetadata, isSigner: false, isWritable: true },
    { pubkey: options.collectionMasterEdition, isSigner: false, isWritable: false },
    { pubkey: options.collectionUpdateAuthority, isSigner: false, isWritable: false },
    { pubkey: options.tokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_SLOT_HASHES_PUBKEY, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: CANDY_MACHINE_PROGRAM_ID,
    data: MINT_DISCRIMINATOR,
  })
}

/**
 * Create an Update Candy Machine instruction
 */
export function updateCandyMachine(options: UpdateCandyMachineOptions): TransactionInstruction {
  const keys = [
    { pubkey: options.candyMachine, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: true, isWritable: false },
  ]

  const data = Buffer.concat([
    UPDATE_DISCRIMINATOR,
    serializeCandyMachineData(options.data),
  ])

  return new TransactionInstruction({
    keys,
    programId: CANDY_MACHINE_PROGRAM_ID,
    data,
  })
}

/**
 * Create a Set Authority instruction
 */
export function setCandyMachineAuthority(
  candyMachine: PublicKey,
  authority: PublicKey,
  newAuthority: PublicKey
): TransactionInstruction {
  const keys = [
    { pubkey: candyMachine, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: false },
  ]

  const data = Buffer.concat([
    SET_AUTHORITY_DISCRIMINATOR,
    newAuthority.toBuffer(),
  ])

  return new TransactionInstruction({
    keys,
    programId: CANDY_MACHINE_PROGRAM_ID,
    data,
  })
}

/**
 * Create a Withdraw instruction
 */
export function withdraw(options: WithdrawOptions): TransactionInstruction {
  const keys = [
    { pubkey: options.candyMachine, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: true, isWritable: true },
  ]

  return new TransactionInstruction({
    keys,
    programId: CANDY_MACHINE_PROGRAM_ID,
    data: WITHDRAW_DISCRIMINATOR,
  })
}

// Serialization helpers

function serializeCandyMachineData(data: CandyMachineData): Buffer {
  const parts: Buffer[] = []

  // Items available
  const itemsBuffer = Buffer.alloc(8)
  itemsBuffer.writeBigUInt64LE(data.itemsAvailable)
  parts.push(itemsBuffer)

  // Symbol
  const symbolBuffer = Buffer.from(data.symbol)
  const symbolLenBuffer = Buffer.alloc(4)
  symbolLenBuffer.writeUInt32LE(symbolBuffer.length)
  parts.push(symbolLenBuffer, symbolBuffer)

  // Seller fee basis points
  const feeBuffer = Buffer.alloc(2)
  feeBuffer.writeUInt16LE(data.sellerFeeBasisPoints)
  parts.push(feeBuffer)

  // Max supply
  const maxSupplyBuffer = Buffer.alloc(8)
  maxSupplyBuffer.writeBigUInt64LE(data.maxSupply)
  parts.push(maxSupplyBuffer)

  // Is mutable
  parts.push(Buffer.from([data.isMutable ? 1 : 0]))

  // Creators
  const creatorsLenBuffer = Buffer.alloc(4)
  creatorsLenBuffer.writeUInt32LE(data.creators.length)
  parts.push(creatorsLenBuffer)
  for (const creator of data.creators) {
    parts.push(serializeCreator(creator))
  }

  // Config line settings (optional)
  if (data.configLineSettings) {
    parts.push(Buffer.from([1])) // Some
    parts.push(serializeConfigLineSettings(data.configLineSettings))
  } else {
    parts.push(Buffer.from([0])) // None
  }

  // Hidden settings (optional)
  if (data.hiddenSettings) {
    parts.push(Buffer.from([1])) // Some
    parts.push(serializeHiddenSettings(data.hiddenSettings))
  } else {
    parts.push(Buffer.from([0])) // None
  }

  return Buffer.concat(parts)
}

function serializeCreator(creator: Creator): Buffer {
  return Buffer.concat([
    creator.address.toBuffer(),
    Buffer.from([creator.verified ? 1 : 0]),
    Buffer.from([creator.percentageShare]),
  ])
}

function serializeConfigLineSettings(settings: {
  prefixName: string
  nameLength: number
  prefixUri: string
  uriLength: number
  isSequential: boolean
}): Buffer {
  const parts: Buffer[] = []

  const prefixNameBuffer = Buffer.from(settings.prefixName)
  const prefixNameLenBuffer = Buffer.alloc(4)
  prefixNameLenBuffer.writeUInt32LE(prefixNameBuffer.length)
  parts.push(prefixNameLenBuffer, prefixNameBuffer)

  const nameLengthBuffer = Buffer.alloc(4)
  nameLengthBuffer.writeUInt32LE(settings.nameLength)
  parts.push(nameLengthBuffer)

  const prefixUriBuffer = Buffer.from(settings.prefixUri)
  const prefixUriLenBuffer = Buffer.alloc(4)
  prefixUriLenBuffer.writeUInt32LE(prefixUriBuffer.length)
  parts.push(prefixUriLenBuffer, prefixUriBuffer)

  const uriLengthBuffer = Buffer.alloc(4)
  uriLengthBuffer.writeUInt32LE(settings.uriLength)
  parts.push(uriLengthBuffer)

  parts.push(Buffer.from([settings.isSequential ? 1 : 0]))

  return Buffer.concat(parts)
}

function serializeHiddenSettings(settings: {
  name: string
  uri: string
  hash: Uint8Array
}): Buffer {
  const parts: Buffer[] = []

  const nameBuffer = Buffer.from(settings.name)
  const nameLenBuffer = Buffer.alloc(4)
  nameLenBuffer.writeUInt32LE(nameBuffer.length)
  parts.push(nameLenBuffer, nameBuffer)

  const uriBuffer = Buffer.from(settings.uri)
  const uriLenBuffer = Buffer.alloc(4)
  uriLenBuffer.writeUInt32LE(uriBuffer.length)
  parts.push(uriLenBuffer, uriBuffer)

  parts.push(Buffer.from(settings.hash))

  return Buffer.concat(parts)
}

function serializeConfigLines(configLines: ConfigLine[]): Buffer {
  const parts: Buffer[] = []

  const lenBuffer = Buffer.alloc(4)
  lenBuffer.writeUInt32LE(configLines.length)
  parts.push(lenBuffer)

  for (const line of configLines) {
    const nameBuffer = Buffer.from(line.name)
    const nameLenBuffer = Buffer.alloc(4)
    nameLenBuffer.writeUInt32LE(nameBuffer.length)
    parts.push(nameLenBuffer, nameBuffer)

    const uriBuffer = Buffer.from(line.uri)
    const uriLenBuffer = Buffer.alloc(4)
    uriLenBuffer.writeUInt32LE(uriBuffer.length)
    parts.push(uriLenBuffer, uriBuffer)
  }

  return Buffer.concat(parts)
}
