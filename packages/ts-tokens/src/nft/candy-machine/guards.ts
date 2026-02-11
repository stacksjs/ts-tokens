/**
 * Candy Machine Guards Management
 *
 * High-level wrappers for managing Candy Guard accounts.
 */

import {
  PublicKey,
  SystemProgram,
  Keypair,
} from '@solana/web3.js'
import type { TransactionInstruction } from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../../types'
import { sendAndConfirmTransaction, buildTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'
import { createConnection } from '../../drivers/solana/connection'
import { serializeGuardSet } from '../../programs/candy-machine/guards'
import type { GuardSet } from '../../programs/candy-machine/guards'

const CANDY_GUARD_PROGRAM_ID = new PublicKey('Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g')
const CANDY_MACHINE_PROGRAM_ID = new PublicKey('CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR')

// Candy Guard instruction discriminators (Anchor style)
const INITIALIZE_GUARD_DISCRIMINATOR = Buffer.from([56, 231, 179, 6, 104, 218, 224, 125])
const UPDATE_GUARD_DISCRIMINATOR = Buffer.from([44, 227, 213, 80, 78, 124, 78, 182])
const WRAP_DISCRIMINATOR = Buffer.from([178, 231, 32, 164, 240, 70, 174, 234])
const UNWRAP_DISCRIMINATOR = Buffer.from([208, 219, 44, 172, 134, 144, 41, 249])
const MINT_V2_DISCRIMINATOR = Buffer.from([120, 121, 23, 146, 173, 110, 199, 205])

/**
 * Derive the Candy Guard PDA for a Candy Machine
 */
function findCandyGuardPda(base: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('candy_guard'), base.toBuffer()],
    CANDY_GUARD_PROGRAM_ID
  )
}

/**
 * Add guards to a Candy Machine
 *
 * Creates a Candy Guard account and wraps it around the CM.
 */
export async function addGuards(
  candyMachine: string,
  guards: GuardSet,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<TransactionResult & { candyGuard: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const candyMachinePubkey = new PublicKey(candyMachine)
  const base = Keypair.generate()
  const [candyGuard] = findCandyGuardPda(base.publicKey)

  const guardData = serializeGuardSet(guards)

  const instructions: TransactionInstruction[] = []

  // Initialize candy guard
  const initData = Buffer.concat([
    INITIALIZE_GUARD_DISCRIMINATOR,
    guardData,
  ])

  instructions.push({
    keys: [
      { pubkey: candyGuard, isSigner: false, isWritable: true },
      { pubkey: base.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: CANDY_GUARD_PROGRAM_ID,
    data: initData,
  })

  // Wrap candy guard around candy machine
  instructions.push({
    keys: [
      { pubkey: candyGuard, isSigner: false, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: candyMachinePubkey, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: CANDY_MACHINE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: CANDY_GUARD_PROGRAM_ID,
    data: WRAP_DISCRIMINATOR,
  })

  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(base)
  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    ...result,
    candyGuard: candyGuard.toBase58(),
  }
}

/**
 * Update guards on an existing Candy Guard
 */
export async function updateGuards(
  candyMachine: string,
  guards: GuardSet,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const candyMachinePubkey = new PublicKey(candyMachine)

  // Fetch the candy machine to find its mint authority (the candy guard)
  const accountInfo = await connection.getAccountInfo(candyMachinePubkey)
  if (!accountInfo) {
    throw new Error('Candy Machine account not found')
  }

  const { deserializeCandyMachine } = await import('../../programs/candy-machine/accounts')
  const cm = deserializeCandyMachine(accountInfo.data as Buffer)
  const candyGuard = cm.mintAuthority

  const guardData = serializeGuardSet(guards)

  const data = Buffer.concat([
    UPDATE_GUARD_DISCRIMINATOR,
    guardData,
  ])

  const instruction: TransactionInstruction = {
    keys: [
      { pubkey: candyGuard, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    ],
    programId: CANDY_GUARD_PROGRAM_ID,
    data,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, txOptions)
}

/**
 * Remove guards from a Candy Machine (unwrap)
 */
export async function removeGuards(
  candyMachine: string,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const candyMachinePubkey = new PublicKey(candyMachine)

  // Fetch the candy machine to find its mint authority (the candy guard)
  const accountInfo = await connection.getAccountInfo(candyMachinePubkey)
  if (!accountInfo) {
    throw new Error('Candy Machine account not found')
  }

  const { deserializeCandyMachine } = await import('../../programs/candy-machine/accounts')
  const cm = deserializeCandyMachine(accountInfo.data as Buffer)
  const candyGuard = cm.mintAuthority

  const instruction: TransactionInstruction = {
    keys: [
      { pubkey: candyGuard, isSigner: false, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: candyMachinePubkey, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: CANDY_MACHINE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: CANDY_GUARD_PROGRAM_ID,
    data: UNWRAP_DISCRIMINATOR,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, txOptions)
}

/**
 * Mint an NFT through the Candy Guard program
 */
export async function mintWithGuard(
  candyMachine: string,
  guardLabel: string | null,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<{ mint: string; signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const candyMachinePubkey = new PublicKey(candyMachine)

  // Fetch the candy machine to get candy guard and collection info
  const accountInfo = await connection.getAccountInfo(candyMachinePubkey)
  if (!accountInfo) {
    throw new Error('Candy Machine account not found')
  }

  const { deserializeCandyMachine } = await import('../../programs/candy-machine/accounts')
  const cm = deserializeCandyMachine(accountInfo.data as Buffer)
  const candyGuard = cm.mintAuthority

  const { findMetadataPda, findMasterEditionPda } = await import('../../programs/token-metadata/pda')
  const { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } = await import('@solana/spl-token')

  const mintKeypair = Keypair.generate()
  const [nftMetadata] = findMetadataPda(mintKeypair.publicKey)
  const [nftMasterEdition] = findMasterEditionPda(mintKeypair.publicKey)
  const [collectionMetadata] = findMetadataPda(cm.collectionMint)
  const [collectionMasterEdition] = findMasterEditionPda(cm.collectionMint)

  // Derive mint ATA
  const [mintAta] = PublicKey.findProgramAddressSync(
    [
      payer.publicKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mintKeypair.publicKey.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Build label buffer
  const labelBuffer = guardLabel
    ? Buffer.concat([
        Buffer.from([1]), // Some
        (() => {
          const lb = Buffer.from(guardLabel)
          const len = Buffer.alloc(4)
          len.writeUInt32LE(lb.length)
          return Buffer.concat([len, lb])
        })(),
      ])
    : Buffer.from([0]) // None

  const data = Buffer.concat([
    MINT_V2_DISCRIMINATOR,
    labelBuffer,
  ])

  const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

  const instruction: TransactionInstruction = {
    keys: [
      { pubkey: candyGuard, isSigner: false, isWritable: false },
      { pubkey: CANDY_MACHINE_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: candyMachinePubkey, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: nftMetadata, isSigner: false, isWritable: true },
      { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: nftMasterEdition, isSigner: false, isWritable: true },
      { pubkey: cm.collectionMint, isSigner: false, isWritable: false },
      { pubkey: collectionMetadata, isSigner: false, isWritable: true },
      { pubkey: collectionMasterEdition, isSigner: false, isWritable: false },
      { pubkey: cm.authority, isSigner: false, isWritable: false },
      { pubkey: mintAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: CANDY_GUARD_PROGRAM_ID,
    data,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(mintKeypair)
  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    mint: mintKeypair.publicKey.toBase58(),
    signature: result.signature,
  }
}

export type { GuardSet }
