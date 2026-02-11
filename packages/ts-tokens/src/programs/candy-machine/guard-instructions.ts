/**
 * Candy Guard Instructions
 *
 * Raw instruction builders for the Candy Guard program.
 * Program ID: Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_SLOT_HASHES_PUBKEY,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { serializeGuardSet, type GuardSet } from './guards'

const CANDY_GUARD_PROGRAM_ID = new PublicKey('Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g')
const CANDY_MACHINE_PROGRAM_ID = new PublicKey('CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Instruction discriminators (Anchor style)
const INITIALIZE_GUARD_DISCRIMINATOR = Buffer.from([56, 232, 131, 4, 122, 110, 169, 186])
const UPDATE_GUARD_DISCRIMINATOR = Buffer.from([112, 62, 115, 124, 55, 28, 194, 250])
const WRAP_DISCRIMINATOR = Buffer.from([178, 95, 38, 150, 182, 181, 60, 32])
const UNWRAP_DISCRIMINATOR = Buffer.from([153, 18, 133, 96, 56, 219, 193, 183])
const MINT_WITH_GUARD_DISCRIMINATOR = Buffer.from([51, 57, 225, 47, 182, 146, 137, 166])

/**
 * Guard group for organizing guards by label
 */
export interface GuardGroup {
  label: string
  guards: GuardSet
}

/**
 * Initialize a Candy Guard
 *
 * Creates a new Candy Guard account with the provided guard set configuration.
 * The guard wraps a Candy Machine and enforces minting conditions.
 */
export function initializeCandyGuard(params: {
  /** Base keypair for PDA derivation */
  base: PublicKey
  /** Authority for the guard */
  authority: PublicKey
  /** Payer for account creation */
  payer: PublicKey
  /** Default guard set */
  guards: GuardSet
  /** Optional guard groups */
  groups?: GuardGroup[]
}): TransactionInstruction {
  const [candyGuard] = PublicKey.findProgramAddressSync(
    [Buffer.from('candy_guard'), params.base.toBuffer()],
    CANDY_GUARD_PROGRAM_ID
  )

  const keys = [
    { pubkey: candyGuard, isSigner: false, isWritable: true },
    { pubkey: params.base, isSigner: true, isWritable: false },
    { pubkey: params.authority, isSigner: false, isWritable: false },
    { pubkey: params.payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  const guardsData = serializeGuardSet(params.guards)
  const groupsData = serializeGuardGroups(params.groups || [])

  const data = Buffer.concat([
    INITIALIZE_GUARD_DISCRIMINATOR,
    guardsData,
    groupsData,
  ])

  return new TransactionInstruction({
    keys,
    programId: CANDY_GUARD_PROGRAM_ID,
    data,
  })
}

/**
 * Update a Candy Guard's configuration
 *
 * Replaces the guard set and/or groups on an existing Candy Guard.
 */
export function updateCandyGuard(params: {
  /** Candy Guard account */
  candyGuard: PublicKey
  /** Authority (signer) */
  authority: PublicKey
  /** Payer for additional space if needed */
  payer: PublicKey
  /** New default guard set */
  guards: GuardSet
  /** New guard groups */
  groups?: GuardGroup[]
}): TransactionInstruction {
  const keys = [
    { pubkey: params.candyGuard, isSigner: false, isWritable: true },
    { pubkey: params.authority, isSigner: true, isWritable: false },
    { pubkey: params.payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  const guardsData = serializeGuardSet(params.guards)
  const groupsData = serializeGuardGroups(params.groups || [])

  const data = Buffer.concat([
    UPDATE_GUARD_DISCRIMINATOR,
    guardsData,
    groupsData,
  ])

  return new TransactionInstruction({
    keys,
    programId: CANDY_GUARD_PROGRAM_ID,
    data,
  })
}

/**
 * Wrap a Candy Machine with a Candy Guard
 *
 * Sets the Candy Guard as the mint authority of the Candy Machine,
 * requiring all mints to go through the guard validation.
 */
export function wrapCandyMachine(params: {
  /** Candy Guard account */
  candyGuard: PublicKey
  /** Candy Machine to wrap */
  candyMachine: PublicKey
  /** Candy Machine authority (signer) */
  candyMachineAuthority: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: params.candyGuard, isSigner: false, isWritable: false },
    { pubkey: params.candyMachine, isSigner: false, isWritable: true },
    { pubkey: params.candyMachineAuthority, isSigner: true, isWritable: false },
    { pubkey: CANDY_MACHINE_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: CANDY_GUARD_PROGRAM_ID,
    data: WRAP_DISCRIMINATOR,
  })
}

/**
 * Unwrap a Candy Machine from a Candy Guard
 *
 * Restores the original mint authority of the Candy Machine,
 * removing guard enforcement.
 */
export function unwrapCandyMachine(params: {
  /** Candy Guard account */
  candyGuard: PublicKey
  /** Candy Machine to unwrap */
  candyMachine: PublicKey
  /** Guard authority (signer) */
  candyGuardAuthority: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: params.candyGuard, isSigner: false, isWritable: false },
    { pubkey: params.candyMachine, isSigner: false, isWritable: true },
    { pubkey: params.candyGuardAuthority, isSigner: true, isWritable: false },
    { pubkey: CANDY_MACHINE_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: CANDY_GUARD_PROGRAM_ID,
    data: UNWRAP_DISCRIMINATOR,
  })
}

/**
 * Mint an NFT from a Candy Machine with guard validation
 *
 * This instruction validates all guard conditions before allowing the mint.
 * The guard set determines which conditions must be met (payment, start date, etc.)
 */
export function mintWithGuard(params: {
  /** Candy Guard account */
  candyGuard: PublicKey
  /** Candy Machine account */
  candyMachine: PublicKey
  /** Payer for the mint */
  payer: PublicKey
  /** New NFT mint account */
  nftMint: PublicKey
  /** New NFT mint authority */
  nftMintAuthority: PublicKey
  /** New NFT metadata account */
  nftMetadata: PublicKey
  /** New NFT master edition account */
  nftMasterEdition: PublicKey
  /** NFT token account */
  tokenAccount: PublicKey
  /** Collection mint */
  collectionMint: PublicKey
  /** Collection metadata */
  collectionMetadata: PublicKey
  /** Collection master edition */
  collectionMasterEdition: PublicKey
  /** Collection update authority */
  collectionUpdateAuthority: PublicKey
  /** Candy Machine authority PDA */
  candyMachineAuthorityPda: PublicKey
  /** Mint arguments (serialized guard data for validation) */
  mintArgs?: Buffer
  /** Guard group label (optional) */
  group?: string
}): TransactionInstruction {
  const keys = [
    { pubkey: params.candyGuard, isSigner: false, isWritable: false },
    { pubkey: CANDY_MACHINE_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: params.candyMachine, isSigner: false, isWritable: true },
    { pubkey: params.candyMachineAuthorityPda, isSigner: false, isWritable: true },
    { pubkey: params.payer, isSigner: true, isWritable: true },
    { pubkey: params.nftMint, isSigner: true, isWritable: true },
    { pubkey: params.nftMintAuthority, isSigner: true, isWritable: false },
    { pubkey: params.nftMetadata, isSigner: false, isWritable: true },
    { pubkey: params.nftMasterEdition, isSigner: false, isWritable: true },
    { pubkey: params.tokenAccount, isSigner: false, isWritable: true },
    { pubkey: params.collectionMint, isSigner: false, isWritable: false },
    { pubkey: params.collectionMetadata, isSigner: false, isWritable: true },
    { pubkey: params.collectionMasterEdition, isSigner: false, isWritable: false },
    { pubkey: params.collectionUpdateAuthority, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_SLOT_HASHES_PUBKEY, isSigner: false, isWritable: false },
  ]

  // Serialize mint args
  const mintArgsData = params.mintArgs || Buffer.alloc(0)
  const mintArgsLenBuffer = Buffer.alloc(4)
  mintArgsLenBuffer.writeUInt32LE(mintArgsData.length)

  // Serialize group label
  let groupData: Buffer
  if (params.group) {
    const labelBuffer = Buffer.from(params.group)
    const labelLenBuffer = Buffer.alloc(4)
    labelLenBuffer.writeUInt32LE(labelBuffer.length)
    groupData = Buffer.concat([Buffer.from([1]), labelLenBuffer, labelBuffer])
  } else {
    groupData = Buffer.from([0]) // None
  }

  const data = Buffer.concat([
    MINT_WITH_GUARD_DISCRIMINATOR,
    mintArgsLenBuffer,
    mintArgsData,
    groupData,
  ])

  return new TransactionInstruction({
    keys,
    programId: CANDY_GUARD_PROGRAM_ID,
    data,
  })
}

// Serialization helpers

/**
 * Serialize guard groups for instruction data
 */
function serializeGuardGroups(groups: GuardGroup[]): Buffer {
  const parts: Buffer[] = []

  const lenBuffer = Buffer.alloc(4)
  lenBuffer.writeUInt32LE(groups.length)
  parts.push(lenBuffer)

  for (const group of groups) {
    // Label (string with length prefix)
    const labelBuffer = Buffer.from(group.label)
    const labelLenBuffer = Buffer.alloc(4)
    labelLenBuffer.writeUInt32LE(labelBuffer.length)
    parts.push(labelLenBuffer, labelBuffer)

    // Guard set
    parts.push(serializeGuardSet(group.guards))
  }

  return Buffer.concat(parts)
}
