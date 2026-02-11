/**
 * Token Group Management
 *
 * Native token group/collection support using Token-2022 Group extension.
 */

import { PublicKey } from '@solana/web3.js'
import type { TransactionInstruction } from '@solana/web3.js'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'

/**
 * Token group information
 */
export interface TokenGroup {
  groupAddress: string
  updateAuthority: string
  mint: string
  size: number
  maxSize: number
}

/**
 * Token group member information
 */
export interface TokenGroupMember {
  memberAddress: string
  mint: string
  group: string
}

// SPL Token Group instruction discriminators
const INITIALIZE_GROUP = Buffer.from([170, 191, 42, 34, 235, 57, 225, 148])
const INITIALIZE_MEMBER = Buffer.from([59, 237, 197, 108, 21, 178, 11, 92])
const UPDATE_GROUP_MAX_SIZE = Buffer.from([108, 37, 171, 246, 200, 113, 17, 228])

/**
 * Create a token group instruction
 */
function createInitializeGroupInstruction(
  group: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  updateAuthority: PublicKey,
  maxSize: number
): TransactionInstruction {
  const data = Buffer.alloc(8 + 4)
  INITIALIZE_GROUP.copy(data, 0)
  data.writeUInt32LE(maxSize, 8)

  return {
    keys: [
      { pubkey: group, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: mintAuthority, isSigner: true, isWritable: false },
      { pubkey: updateAuthority, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  }
}

/**
 * Create a token group member instruction
 */
function createInitializeMemberInstruction(
  member: PublicKey,
  memberMint: PublicKey,
  memberMintAuthority: PublicKey,
  group: PublicKey,
  groupUpdateAuthority: PublicKey
): TransactionInstruction {
  const data = Buffer.from(INITIALIZE_MEMBER)

  return {
    keys: [
      { pubkey: member, isSigner: false, isWritable: true },
      { pubkey: memberMint, isSigner: false, isWritable: false },
      { pubkey: memberMintAuthority, isSigner: true, isWritable: false },
      { pubkey: group, isSigner: false, isWritable: true },
      { pubkey: groupUpdateAuthority, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  }
}

/**
 * Initialize a token group on a Token-2022 mint
 */
export async function createTokenGroup(
  groupMint: string,
  maxSize: number,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const groupMintPubkey = new PublicKey(groupMint)

  const instruction = createInitializeGroupInstruction(
    groupMintPubkey,
    groupMintPubkey,
    payer.publicKey,
    payer.publicKey,
    maxSize
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return { signature: result.signature }
}

/**
 * Add a member to a token group
 */
export async function addGroupMember(
  groupMint: string,
  memberMint: string,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const groupMintPubkey = new PublicKey(groupMint)
  const memberMintPubkey = new PublicKey(memberMint)

  const instruction = createInitializeMemberInstruction(
    memberMintPubkey,
    memberMintPubkey,
    payer.publicKey,
    groupMintPubkey,
    payer.publicKey
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return { signature: result.signature }
}

/**
 * Update the max size of a token group
 */
export async function updateGroupMaxSize(
  groupMint: string,
  newMaxSize: number,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const groupMintPubkey = new PublicKey(groupMint)

  const data = Buffer.alloc(8 + 4)
  UPDATE_GROUP_MAX_SIZE.copy(data, 0)
  data.writeUInt32LE(newMaxSize, 8)

  const instruction: TransactionInstruction = {
    keys: [
      { pubkey: groupMintPubkey, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return { signature: result.signature }
}
