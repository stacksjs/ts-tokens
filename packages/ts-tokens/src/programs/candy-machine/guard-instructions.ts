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
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_SLOT_HASHES_PUBKEY,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { serializeGuardSet, type GuardSet } from './guards'

const CANDY_GUARD_PROGRAM_ID = new PublicKey('Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g')
const CANDY_MACHINE_PROGRAM_ID = new PublicKey('CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Instruction discriminators (Anchor style: sha256('global:NAME')[0..8])
const INITIALIZE_GUARD_DISCRIMINATOR = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237])
const UPDATE_GUARD_DISCRIMINATOR = Buffer.from([219, 200, 88, 176, 158, 63, 253, 127])
const WRAP_DISCRIMINATOR = Buffer.from([178, 40, 10, 189, 228, 129, 186, 140])
const UNWRAP_DISCRIMINATOR = Buffer.from([126, 175, 198, 14, 212, 69, 50, 44])
const MINT_V2_DISCRIMINATOR = Buffer.from([120, 121, 23, 146, 173, 110, 199, 205])

/** Group labels are a fixed 6-byte, zero-padded ASCII array on-chain. */
const GROUP_LABEL_SIZE = 6

function u32LE(value: number): Buffer {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value)
  return buffer
}

/**
 * Serialize `CandyGuardData` and wrap it as a borsh `Vec<u8>`.
 *
 * On-chain `CandyGuardData::save` writes the default guard set, then the
 * group count (u32) followed by each group, and finally stores the whole
 * blob behind a u32 length prefix (the `data: Vec<u8>` argument). The group
 * counter is always emitted, even when there are no groups.
 */
function serializeCandyGuardData(guards: GuardSet, groups: GuardGroup[]): Buffer {
  const payload = Buffer.concat([
    serializeGuardSet(guards),
    u32LE(groups.length),
    ...groups.map(serializeGuardGroup),
  ])

  return Buffer.concat([u32LE(payload.length), payload])
}

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

  const data = Buffer.concat([
    INITIALIZE_GUARD_DISCRIMINATOR,
    serializeCandyGuardData(params.guards, params.groups || []),
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

  const data = Buffer.concat([
    UPDATE_GUARD_DISCRIMINATOR,
    serializeCandyGuardData(params.guards, params.groups || []),
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
  /** Candy Guard authority (signer) */
  authority: PublicKey
  /** Candy Machine to wrap */
  candyMachine: PublicKey
  /** Candy Machine authority (signer) */
  candyMachineAuthority: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: params.candyGuard, isSigner: false, isWritable: false },
    { pubkey: params.authority, isSigner: true, isWritable: false },
    { pubkey: params.candyMachine, isSigner: false, isWritable: true },
    { pubkey: CANDY_MACHINE_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: params.candyMachineAuthority, isSigner: true, isWritable: false },
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
  /** Guard authority (signer) */
  candyGuardAuthority: PublicKey
  /** Candy Machine to unwrap */
  candyMachine: PublicKey
  /** Candy Machine authority (signer) */
  candyMachineAuthority: PublicKey
}): TransactionInstruction {
  const keys = [
    { pubkey: params.candyGuard, isSigner: false, isWritable: false },
    { pubkey: params.candyGuardAuthority, isSigner: true, isWritable: false },
    { pubkey: params.candyMachine, isSigner: false, isWritable: true },
    { pubkey: params.candyMachineAuthority, isSigner: true, isWritable: false },
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
  /** Candy Machine authority PDA (mint authority) */
  candyMachineAuthorityPda: PublicKey
  /** Payer for the mint */
  payer: PublicKey
  /** Minter (recipient) — signs the mint */
  minter: PublicKey
  /** New NFT mint account */
  nftMint: PublicKey
  /** New NFT mint authority */
  nftMintAuthority: PublicKey
  /** New NFT metadata account */
  nftMetadata: PublicKey
  /** New NFT master edition account */
  nftMasterEdition: PublicKey
  /** NFT associated token account */
  nftTokenAccount: PublicKey
  /** Token record PDA (programmable NFTs only) */
  tokenRecord?: PublicKey
  /** Collection metadata delegate record */
  collectionDelegateRecord: PublicKey
  /** Collection mint */
  collectionMint: PublicKey
  /** Collection metadata */
  collectionMetadata: PublicKey
  /** Collection master edition */
  collectionMasterEdition: PublicKey
  /** Collection update authority */
  collectionUpdateAuthority: PublicKey
  /** Optional token auth rules program (programmable NFTs only) */
  authorizationRulesProgram?: PublicKey
  /** Optional token auth rules account (programmable NFTs only) */
  authorizationRules?: PublicKey
  /** Guard remaining accounts (payment destinations, counter PDAs, etc.) */
  remainingAccounts?: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>
  /** Mint arguments (serialized guard data for validation) */
  mintArgs?: Buffer
  /** Guard group label (optional) */
  group?: string
}): TransactionInstruction {
  // Optional accounts that are not provided carry the Candy Guard program id
  // in their slot as the Anchor "None" marker. They must still be present
  // because accounts follow them positionally.
  const keys = [
    { pubkey: params.candyGuard, isSigner: false, isWritable: false },
    { pubkey: CANDY_MACHINE_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: params.candyMachine, isSigner: false, isWritable: true },
    { pubkey: params.candyMachineAuthorityPda, isSigner: false, isWritable: true },
    { pubkey: params.payer, isSigner: true, isWritable: true },
    { pubkey: params.minter, isSigner: true, isWritable: true },
    { pubkey: params.nftMint, isSigner: true, isWritable: true },
    { pubkey: params.nftMintAuthority, isSigner: true, isWritable: false },
    { pubkey: params.nftMetadata, isSigner: false, isWritable: true },
    { pubkey: params.nftMasterEdition, isSigner: false, isWritable: true },
    { pubkey: params.nftTokenAccount, isSigner: false, isWritable: true },
    {
      pubkey: params.tokenRecord ?? CANDY_GUARD_PROGRAM_ID,
      isSigner: false,
      isWritable: params.tokenRecord ? true : false,
    },
    { pubkey: params.collectionDelegateRecord, isSigner: false, isWritable: false },
    { pubkey: params.collectionMint, isSigner: false, isWritable: false },
    { pubkey: params.collectionMetadata, isSigner: false, isWritable: true },
    { pubkey: params.collectionMasterEdition, isSigner: false, isWritable: false },
    { pubkey: params.collectionUpdateAuthority, isSigner: false, isWritable: false },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_SLOT_HASHES_PUBKEY, isSigner: false, isWritable: false },
    {
      pubkey: params.authorizationRulesProgram ?? CANDY_GUARD_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: params.authorizationRules ?? CANDY_GUARD_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    ...(params.remainingAccounts ?? []),
  ]

  const data = Buffer.concat([
    MINT_V2_DISCRIMINATOR,
    serializeMintV2Args(params.mintArgs, params.group),
  ])

  return new TransactionInstruction({
    keys,
    programId: CANDY_GUARD_PROGRAM_ID,
    data,
  })
}

/**
 * Serialize the mint_v2 instruction arguments:
 * `mintArgs: Vec<u8>` (u32 length prefix + bytes) then an Option<String> label.
 */
function serializeMintV2Args(mintArgs?: Buffer, group?: string): Buffer {
  const args = mintArgs ?? Buffer.alloc(0)

  let labelData: Buffer
  if (group) {
    const labelBuffer = Buffer.from(group)
    labelData = Buffer.concat([Buffer.from([1]), u32LE(labelBuffer.length), labelBuffer])
  } else {
    labelData = Buffer.from([0]) // None
  }

  return Buffer.concat([u32LE(args.length), args, labelData])
}

// Serialization helpers

/**
 * Serialize a single guard group for instruction data.
 *
 * The label is a FIXED 6-byte, zero-padded array on-chain (not a
 * length-prefixed string), followed by the group's guard set.
 */
function serializeGuardGroup(group: GuardGroup): Buffer {
  const labelBytes = Buffer.from(group.label)
  if (labelBytes.length > GROUP_LABEL_SIZE) {
    throw new Error(
      `Guard group label "${group.label}" exceeds the maximum of ${GROUP_LABEL_SIZE} bytes`
    )
  }

  const labelBuffer = Buffer.alloc(GROUP_LABEL_SIZE)
  labelBytes.copy(labelBuffer)

  return Buffer.concat([labelBuffer, serializeGuardSet(group.guards)])
}
