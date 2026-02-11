/**
 * Multi-Sig Transaction Operations
 *
 * High-level transaction lifecycle: propose, approve, reject, execute, cancel.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  MultisigResult,
  ProposeTransactionOptions,
  TransactionActionOptions,
  OnChainTransaction,
  MultisigHistoryEntry,
} from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { getTransactionAddress, MULTISIG_PROGRAM_ID } from './program'
import { getOnChainMultisig } from './management'
import {
  createProposeTransactionInstruction,
  createApproveTransactionInstruction,
  createRejectTransactionInstruction,
  createExecuteTransactionInstruction,
  createCancelTransactionInstruction,
} from './instructions'

/**
 * Propose a new multisig transaction
 */
export async function proposeTransaction(
  options: ProposeTransactionOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<MultisigResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const multisigData = await getOnChainMultisig(connection, options.multisig)
  if (!multisigData) {
    throw new Error('Multisig account not found')
  }

  const txIndex = multisigData.transactionCount
  const transactionPda = getTransactionAddress(options.multisig, txIndex)

  const expiresAt = options.expiresIn
    ? BigInt(Math.floor(Date.now() / 1000) + options.expiresIn)
    : undefined

  const instruction = createProposeTransactionInstruction(
    payer.publicKey,
    options.multisig,
    transactionPda,
    options.instructionData,
    expiresAt
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
    transaction: transactionPda.toBase58(),
  }
}

/**
 * Approve a multisig transaction
 */
export async function approveTransaction(
  options: TransactionActionOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<MultisigResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const transactionPda = getTransactionAddress(options.multisig, options.transactionIndex)

  const instruction = createApproveTransactionInstruction(
    payer.publicKey,
    options.multisig,
    transactionPda
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
    transaction: transactionPda.toBase58(),
  }
}

/**
 * Reject a multisig transaction
 */
export async function rejectTransaction(
  options: TransactionActionOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<MultisigResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const transactionPda = getTransactionAddress(options.multisig, options.transactionIndex)

  const instruction = createRejectTransactionInstruction(
    payer.publicKey,
    options.multisig,
    transactionPda
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
    transaction: transactionPda.toBase58(),
  }
}

/**
 * Execute an approved multisig transaction
 */
export async function executeTransaction(
  options: TransactionActionOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<MultisigResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const transactionPda = getTransactionAddress(options.multisig, options.transactionIndex)

  const instruction = createExecuteTransactionInstruction(
    payer.publicKey,
    options.multisig,
    transactionPda
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
    transaction: transactionPda.toBase58(),
  }
}

/**
 * Cancel a pending multisig transaction (proposer only)
 */
export async function cancelTransaction(
  options: TransactionActionOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<MultisigResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const transactionPda = getTransactionAddress(options.multisig, options.transactionIndex)

  const instruction = createCancelTransactionInstruction(
    payer.publicKey,
    options.multisig,
    transactionPda
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
    transaction: transactionPda.toBase58(),
  }
}

/**
 * Fetch and parse an on-chain multisig transaction
 */
export async function getTransaction(
  connection: import('@solana/web3.js').Connection,
  multisig: PublicKey,
  txIndex: bigint
): Promise<OnChainTransaction | null> {
  const transactionPda = getTransactionAddress(multisig, txIndex)
  const accountInfo = await connection.getAccountInfo(transactionPda)

  if (!accountInfo) {
    return null
  }

  const data = accountInfo.data

  // Account layout:
  // 32 bytes: multisig
  // 32 bytes: proposer
  // 1 byte:   executed
  // 8 bytes:  createdAt (i64 LE)
  // 1 byte:   hasExpiry
  // 8 bytes:  expiresAt (i64 LE, if hasExpiry)
  // 4 bytes:  instructionData length
  // N bytes:  instructionData
  // 1 byte:   approvalCount
  // 32 * approvalCount: approval pubkeys
  // 1 byte:   rejectionCount
  // 32 * rejectionCount: rejection pubkeys

  let offset = 0
  const msig = new PublicKey(data.subarray(offset, offset + 32)); offset += 32
  const proposer = new PublicKey(data.subarray(offset, offset + 32)); offset += 32
  const executed = data.readUInt8(offset) === 1; offset += 1
  const createdAt = data.readBigInt64LE(offset); offset += 8
  const hasExpiry = data.readUInt8(offset) === 1; offset += 1
  let expiresAt: bigint | undefined
  if (hasExpiry) {
    expiresAt = BigInt(data.readBigInt64LE(offset)); offset += 8
  }
  const ixDataLen = data.readUInt32LE(offset); offset += 4
  const instructionData = Buffer.from(data.subarray(offset, offset + ixDataLen)); offset += ixDataLen
  const approvalCount = data.readUInt8(offset); offset += 1
  const approvals: PublicKey[] = []
  for (let i = 0; i < approvalCount; i++) {
    approvals.push(new PublicKey(data.subarray(offset, offset + 32)))
    offset += 32
  }
  const rejectionCount = data.readUInt8(offset); offset += 1
  const rejections: PublicKey[] = []
  for (let i = 0; i < rejectionCount; i++) {
    rejections.push(new PublicKey(data.subarray(offset, offset + 32)))
    offset += 32
  }

  return {
    address: transactionPda,
    multisig: msig,
    proposer,
    instructionData,
    approvals,
    rejections,
    executed,
    createdAt: BigInt(createdAt),
    expiresAt,
  }
}

/**
 * Get all pending (unexecuted) transactions for a multisig
 */
export async function getPendingTransactions(
  connection: import('@solana/web3.js').Connection,
  multisig: PublicKey
): Promise<OnChainTransaction[]> {
  const multisigData = await getOnChainMultisig(connection, multisig)
  if (!multisigData) {
    return []
  }

  const pending: OnChainTransaction[] = []
  for (let i = 0n; i < multisigData.transactionCount; i++) {
    const tx = await getTransaction(connection, multisig, i)
    if (tx && !tx.executed) {
      pending.push(tx)
    }
  }

  return pending
}

/**
 * Get transaction history for a multisig
 */
export async function getTransactionHistory(
  connection: import('@solana/web3.js').Connection,
  multisig: PublicKey
): Promise<MultisigHistoryEntry[]> {
  const multisigData = await getOnChainMultisig(connection, multisig)
  if (!multisigData) {
    return []
  }

  const history: MultisigHistoryEntry[] = []
  for (let i = 0n; i < multisigData.transactionCount; i++) {
    const tx = await getTransaction(connection, multisig, i)
    if (tx) {
      history.push({
        timestamp: tx.createdAt,
        action: tx.executed ? 'executed' : 'proposed',
        signature: tx.address.toBase58(),
        actor: tx.proposer,
      })
    }
  }

  return history
}
