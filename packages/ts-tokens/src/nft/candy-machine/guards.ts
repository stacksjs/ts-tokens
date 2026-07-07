/**
 * Candy Machine Guards Management
 *
 * High-level wrappers for managing Candy Guard accounts.
 */

import {
  PublicKey,
  Keypair,
} from '@solana/web3.js'
import type { TransactionInstruction } from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../../types'
import { sendAndConfirmTransaction, buildTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'
import { createConnection } from '../../drivers/solana/connection'
import type { GuardSet } from '../../programs/candy-machine/guards'
import {
  initializeCandyGuard,
  updateCandyGuard as updateCandyGuardInstruction,
  wrapCandyMachine,
  unwrapCandyMachine,
  mintWithGuard as mintWithGuardInstruction,
} from '../../programs/candy-machine/guard-instructions'
import {
  findCandyMachineAuthorityPda,
  findCollectionDelegateRecordPda,
} from '../../programs/candy-machine/pda'

const CANDY_GUARD_PROGRAM_ID = new PublicKey('Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g')

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

  const instructions: TransactionInstruction[] = []

  // Initialize candy guard. The builder serializes CandyGuardData with its
  // borsh Vec<u8> length prefix and the mandatory group counter.
  instructions.push(
    initializeCandyGuard({
      base: base.publicKey,
      authority: payer.publicKey,
      payer: payer.publicKey,
      guards,
    })
  )

  // Wrap candy guard around candy machine
  instructions.push(
    wrapCandyMachine({
      candyGuard,
      authority: payer.publicKey,
      candyMachine: candyMachinePubkey,
      candyMachineAuthority: payer.publicKey,
    })
  )

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

  const instruction = updateCandyGuardInstruction({
    candyGuard,
    authority: payer.publicKey,
    payer: payer.publicKey,
    guards,
  })

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

  const instruction = unwrapCandyMachine({
    candyGuard,
    candyGuardAuthority: payer.publicKey,
    candyMachine: candyMachinePubkey,
    candyMachineAuthority: payer.publicKey,
  })

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

  const { deserializeCandyMachine, parseCandyGuard } = await import('../../programs/candy-machine/accounts')
  const cm = deserializeCandyMachine(accountInfo.data as Buffer)
  const candyGuard = cm.mintAuthority

  const {
    findMetadataPda,
    findMasterEditionPda,
  } = await import('../../programs/token-metadata/pda')
  const { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } = await import('@solana/spl-token')

  const mintKeypair = Keypair.generate()
  const [authorityPda] = findCandyMachineAuthorityPda(candyMachinePubkey)
  const [nftMetadata] = findMetadataPda(mintKeypair.publicKey)
  const [nftMasterEdition] = findMasterEditionPda(mintKeypair.publicKey)
  const [collectionMetadata] = findMetadataPda(cm.collectionMint)
  const [collectionMasterEdition] = findMasterEditionPda(cm.collectionMint)
  // mint_v2 uses the token-metadata *collection delegate* record (v2 seeds),
  // not the legacy collection authority record.
  const [collectionDelegateRecord] = findCollectionDelegateRecordPda(
    cm.collectionMint,
    cm.authority,
    authorityPda
  )

  // Derive mint ATA (recipient token account)
  const [mintAta] = PublicKey.findProgramAddressSync(
    [
      payer.publicKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mintKeypair.publicKey.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Resolve guard remaining accounts (payment destinations, counter PDAs)
  // from the active guard set stored on the Candy Guard account.
  const remainingAccounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> = []
  const guardAccountInfo = await connection.getAccountInfo(candyGuard)
  if (guardAccountInfo) {
    const parsed = parseCandyGuard(guardAccountInfo.data as Buffer)
    const active = extractGuardRemainingAccounts(
      parsed.guardData,
      candyGuard,
      candyMachinePubkey,
      payer.publicKey
    )
    remainingAccounts.push(...active)
  }

  const instruction: TransactionInstruction = mintWithGuardInstruction({
    candyGuard,
    candyMachine: candyMachinePubkey,
    candyMachineAuthorityPda: authorityPda,
    payer: payer.publicKey,
    minter: payer.publicKey,
    nftMint: mintKeypair.publicKey,
    nftMintAuthority: payer.publicKey,
    nftMetadata,
    nftMasterEdition,
    nftTokenAccount: mintAta,
    collectionDelegateRecord,
    collectionMint: cm.collectionMint,
    collectionMetadata,
    collectionMasterEdition,
    collectionUpdateAuthority: cm.authority,
    remainingAccounts,
    group: guardLabel ?? undefined,
  })

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

/**
 * Extract the guard "remaining accounts" required by mint_v2 from a serialized
 * default guard set.
 *
 * The Candy Guard program expects a specific ordered set of extra accounts
 * per active guard (payment destinations, counter PDAs, etc.). This decodes
 * the features bitmap and appends the accounts for the guards we support at
 * mint time — at minimum the SOL payment destination and the mint-limit
 * counter PDA. Guards we cannot resolve locally are skipped; the on-chain
 * program will surface a clear error if their accounts are missing.
 */
function extractGuardRemainingAccounts(
  guardData: Buffer,
  candyGuard: PublicKey,
  candyMachine: PublicKey,
  user: PublicKey
): Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> {
  const accounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> = []

  if (guardData.length < 8) return accounts

  const features = guardData.readBigUInt64LE(0)
  let offset = 8

  const has = (bit: number) => (features & (1n << BigInt(bit))) !== 0n

  // Walk the guard set in enum order, advancing the offset by each active
  // guard's serialized size so we can read the fields we need.
  // GuardType: BotTax=0 SolPayment=1 TokenPayment=2 StartDate=3
  //   ThirdPartySigner=4 TokenGate=5 Gatekeeper=6 EndDate=7 AllowList=8
  //   MintLimit=9 ...

  // BotTax (u64 + bool) = 9
  if (has(0)) offset += 9

  // SolPayment (u64 + pubkey) = 40 — destination is a remaining account.
  if (has(1)) {
    const destination = new PublicKey(guardData.subarray(offset + 8, offset + 40))
    accounts.push({ pubkey: destination, isSigner: false, isWritable: true })
    offset += 40
  }

  // TokenPayment (u64 + pubkey + pubkey) = 72
  if (has(2)) offset += 72
  // StartDate (i64) = 8
  if (has(3)) offset += 8
  // ThirdPartySigner (pubkey) = 32
  if (has(4)) offset += 32
  // TokenGate (u64 + pubkey) = 40
  if (has(5)) offset += 40
  // Gatekeeper (pubkey + bool) = 33
  if (has(6)) offset += 33
  // EndDate (i64) = 8
  if (has(7)) offset += 8
  // AllowList (merkle root) = 32
  if (has(8)) offset += 32

  // MintLimit (u8 id + u16 limit) = 3 — the per-user counter PDA is a
  // remaining account.
  if (has(9)) {
    const id = guardData.readUInt8(offset)
    const [mintLimitPda] = findMintLimitPdaLocal(id, user, candyGuard, candyMachine)
    accounts.push({ pubkey: mintLimitPda, isSigner: false, isWritable: true })
    offset += 3
  }

  return accounts
}

function findMintLimitPdaLocal(
  id: number,
  user: PublicKey,
  candyGuard: PublicKey,
  candyMachine: PublicKey
): [PublicKey, number] {
  const idBuffer = Buffer.alloc(1)
  idBuffer.writeUInt8(id)
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('mint_limit'),
      idBuffer,
      user.toBuffer(),
      candyGuard.toBuffer(),
      candyMachine.toBuffer(),
    ],
    CANDY_GUARD_PROGRAM_ID
  )
}

export type { GuardSet }
