/**
 * Multi-Sig Management
 *
 * High-level multisig CRUD operations: create, addOwner, removeOwner, changeThreshold.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  MultisigResult,
  AddOwnerOptions,
  RemoveOwnerOptions,
  ChangeThresholdOptions,
  OnChainMultisig,
  CreateMultisigOptions,
} from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { getMultisigAddress, MULTISIG_PROGRAM_ID } from './program'
import {
  createCreateMultisigInstruction,
  createAddOwnerInstruction,
  createRemoveOwnerInstruction,
  createChangeThresholdInstruction,
} from './instructions'
import { validateMultisigConfig } from './create'

/**
 * Create a new on-chain multisig account
 */
export async function createOnChainMultisig(
  owners: PublicKey[],
  threshold: number,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<MultisigResult> {
  const errors = validateMultisigConfig({ signers: owners, threshold })
  if (errors.length > 0) {
    throw new Error(`Invalid multisig config: ${errors.join(', ')}`)
  }

  const connection = createConnection(config)
  const payer = loadWallet(config)

  // Derive PDA using nonce 0 (first multisig for this creator)
  const nonce = 0n
  const multisigPda = getMultisigAddress(payer.publicKey, nonce)

  const instruction = createCreateMultisigInstruction(
    payer.publicKey,
    multisigPda,
    owners,
    threshold
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    multisig: multisigPda.toBase58(),
  }
}

/**
 * Add an owner to an existing multisig
 */
export async function addOwner(
  options: AddOwnerOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<MultisigResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = createAddOwnerInstruction(
    options.multisig,
    payer.publicKey,
    options.newOwner
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    multisig: options.multisig.toBase58(),
  }
}

/**
 * Remove an owner from a multisig
 */
export async function removeOwner(
  options: RemoveOwnerOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<MultisigResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = createRemoveOwnerInstruction(
    options.multisig,
    payer.publicKey,
    options.ownerToRemove
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    multisig: options.multisig.toBase58(),
  }
}

/**
 * Change the signature threshold of a multisig
 */
export async function changeThreshold(
  options: ChangeThresholdOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<MultisigResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = createChangeThresholdInstruction(
    options.multisig,
    payer.publicKey,
    options.newThreshold
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    multisig: options.multisig.toBase58(),
  }
}

/**
 * Fetch and parse an on-chain multisig account
 */
export async function getOnChainMultisig(
  connection: import('@solana/web3.js').Connection,
  address: PublicKey
): Promise<OnChainMultisig | null> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    return null
  }

  if (!accountInfo.owner.equals(MULTISIG_PROGRAM_ID)) {
    return null
  }

  const data = accountInfo.data

  // Account layout:
  // 32 bytes: creator
  // 1 byte:   threshold
  // 8 bytes:  nonce (u64 LE)
  // 8 bytes:  transactionCount (u64 LE)
  // 8 bytes:  createdAt (i64 LE)
  // 1 byte:   ownerCount
  // 32 * ownerCount: owner pubkeys

  let offset = 0
  const creator = new PublicKey(data.subarray(offset, offset + 32)); offset += 32
  const threshold = data.readUInt8(offset); offset += 1
  const nonce = data.readBigUInt64LE(offset); offset += 8
  const transactionCount = data.readBigUInt64LE(offset); offset += 8
  const createdAt = data.readBigInt64LE(offset); offset += 8
  const ownerCount = data.readUInt8(offset); offset += 1

  const owners: PublicKey[] = []
  for (let i = 0; i < ownerCount; i++) {
    owners.push(new PublicKey(data.subarray(offset, offset + 32)))
    offset += 32
  }

  return {
    address,
    creator,
    owners,
    threshold,
    nonce,
    transactionCount,
    createdAt: BigInt(createdAt),
  }
}
