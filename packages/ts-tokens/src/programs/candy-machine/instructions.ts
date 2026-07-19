/**
 * Candy Machine v3 Instructions
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
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
import { findCandyMachineAuthorityPda, findCollectionDelegateRecordPda } from './pda'
import { findMetadataPda, findMasterEditionPda } from '../token-metadata/pda'

const CANDY_MACHINE_PROGRAM_ID = new PublicKey('CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Instruction discriminators (Anchor style: sha256('global:NAME')[0..8])
const INITIALIZE_V2_DISCRIMINATOR = Buffer.from([67, 153, 175, 39, 218, 16, 38, 32])
const ADD_CONFIG_LINES_DISCRIMINATOR = Buffer.from([223, 50, 224, 227, 151, 8, 115, 106])
const MINT_V2_DISCRIMINATOR = Buffer.from([120, 121, 23, 146, 173, 110, 199, 205])
const UPDATE_DISCRIMINATOR = Buffer.from([219, 200, 88, 176, 158, 63, 253, 127])
const WITHDRAW_DISCRIMINATOR = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34])
const SET_AUTHORITY_DISCRIMINATOR = Buffer.from([133, 250, 37, 21, 110, 163, 26, 121])

/**
 * Create an Initialize Candy Machine (v2) instruction.
 *
 * Follows the mpl-candy-machine `initializeV2` account order and serializes
 * `data: CandyMachineData` followed by the `tokenStandard: u8`.
 */
export function initializeCandyMachine(
  options: InitializeCandyMachineOptions
): TransactionInstruction {
  const authorityPda =
    options.authorityPda ?? findCandyMachineAuthorityPda(options.candyMachine)[0]
  const collectionMetadata =
    options.collectionMetadata ?? findMetadataPda(options.collectionMint)[0]
  const collectionMasterEdition =
    options.collectionMasterEdition ?? findMasterEditionPda(options.collectionMint)[0]
  const collectionDelegateRecord =
    options.collectionDelegateRecord ??
    findCollectionDelegateRecordPda(
      options.collectionMint,
      options.collectionUpdateAuthority,
      authorityPda
    )[0]

  const keys = [
    { pubkey: options.candyMachine, isSigner: false, isWritable: true },
    { pubkey: authorityPda, isSigner: false, isWritable: true },
    { pubkey: options.authority, isSigner: false, isWritable: false },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    // ruleSet is an optional account; when absent the program id sits in its
    // slot as a "None" marker.
    { pubkey: options.ruleSet ?? CANDY_MACHINE_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: collectionMetadata, isSigner: false, isWritable: true },
    { pubkey: options.collectionMint, isSigner: false, isWritable: false },
    { pubkey: collectionMasterEdition, isSigner: false, isWritable: false },
    { pubkey: options.collectionUpdateAuthority, isSigner: true, isWritable: true },
    { pubkey: collectionDelegateRecord, isSigner: false, isWritable: true },
    // NOTE: per the official mpl-candy-machine IDL and the on-chain
    // InitializeV2 account struct, the SPL Token program is NOT part of this
    // instruction — token_metadata_program is followed directly by
    // system_program. Inserting it here shifts system_program out of its slot
    // and the program rejects the instruction with InvalidProgramId.
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    // Optional pNFT authorization-rules accounts; the program id marks "None".
    {
      pubkey: options.authorizationRulesProgram ?? CANDY_MACHINE_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: options.authorizationRules ?? CANDY_MACHINE_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
  ]

  const data = Buffer.concat([
    INITIALIZE_V2_DISCRIMINATOR,
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
 * Create a Mint V2 instruction (`mint_v2`)
 *
 * This is the only mint instruction accepted by machines created with
 * `initialize_v2` — the deprecated V1 `mint` instruction fails on-chain with
 * InvalidAccountVersion against them.
 *
 * Account order matches the mpl-candy-machine `MintV2` struct. Optional
 * accounts that are not provided carry the candy machine program id in their
 * slot as the Anchor "None" marker; they must still be present because
 * accounts follow them positionally.
 */
export function mintFromCandyMachine(
  options: MintFromCandyMachineOptions
): TransactionInstruction {
  const authorityPda =
    options.authorityPda ?? findCandyMachineAuthorityPda(options.candyMachine)[0]

  const keys = [
    { pubkey: options.candyMachine, isSigner: false, isWritable: true },
    { pubkey: authorityPda, isSigner: false, isWritable: true },
    { pubkey: options.mintAuthority, isSigner: true, isWritable: false },
    { pubkey: options.payer, isSigner: true, isWritable: true },
    { pubkey: options.nftMint, isSigner: options.nftMintIsSigner ?? true, isWritable: true },
    { pubkey: options.nftMintAuthority, isSigner: true, isWritable: false },
    { pubkey: options.nftMetadata, isSigner: false, isWritable: true },
    { pubkey: options.nftMasterEdition, isSigner: false, isWritable: true },
    // Optional token account (program creates the ATA via CPI when absent).
    {
      pubkey: options.tokenAccount ?? CANDY_MACHINE_PROGRAM_ID,
      isSigner: false,
      isWritable: options.tokenAccount ? true : false,
    },
    // Optional token record (pNFTs only).
    {
      pubkey: options.tokenRecord ?? CANDY_MACHINE_PROGRAM_ID,
      isSigner: false,
      isWritable: options.tokenRecord ? true : false,
    },
    { pubkey: options.collectionDelegateRecord, isSigner: false, isWritable: false },
    { pubkey: options.collectionMint, isSigner: false, isWritable: false },
    { pubkey: options.collectionMetadata, isSigner: false, isWritable: true },
    { pubkey: options.collectionMasterEdition, isSigner: false, isWritable: false },
    { pubkey: options.collectionUpdateAuthority, isSigner: false, isWritable: false },
    // Optional legacy collection authority record (legacy V1 collections only).
    {
      pubkey: options.collectionAuthorityRecord ?? CANDY_MACHINE_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_SLOT_HASHES_PUBKEY, isSigner: false, isWritable: false },
    // Optional pNFT authorization-rules accounts; the program id marks "None".
    {
      pubkey: options.authorizationRulesProgram ?? CANDY_MACHINE_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: options.authorizationRules ?? CANDY_MACHINE_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
  ]

  const data = Buffer.concat([
    MINT_V2_DISCRIMINATOR,
    serializeMintV2Args(options.mintArgs, options.group),
  ])

  return new TransactionInstruction({
    keys,
    programId: CANDY_MACHINE_PROGRAM_ID,
    data,
  })
}

/**
 * Serialize the mint_v2 instruction arguments:
 * `mintArgs: Vec<u8>` (u32 length prefix + bytes) then an Option<String> label.
 */
function serializeMintV2Args(mintArgs?: Buffer, group?: string): Buffer {
  const args = mintArgs ?? Buffer.alloc(0)

  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32LE(args.length)

  let labelData: Buffer
  if (group) {
    const labelBuffer = Buffer.from(group)
    const labelLengthBuffer = Buffer.alloc(4)
    labelLengthBuffer.writeUInt32LE(labelBuffer.length)
    labelData = Buffer.concat([Buffer.from([1]), labelLengthBuffer, labelBuffer])
  } else {
    labelData = Buffer.from([0]) // None
  }

  return Buffer.concat([lengthBuffer, args, labelData])
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

export function serializeCandyMachineData(data: CandyMachineData): Buffer {
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
