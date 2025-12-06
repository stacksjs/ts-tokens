/**
 * Multi-Signature Signing
 */

import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js'

import type {
  ExecuteMultisigOptions,
  MultisigTransaction,
  PendingSignature,
  SignTransactionOptions,
} from './types'
import { getMultisig } from './create'

// In-memory storage for pending transactions (in production, use database)
const pendingTransactions = new Map<string, MultisigTransaction>()

/**
 * Create a multi-sig transaction for signing
 */
export async function createMultisigTransaction(
  connection: Connection,
  multisig: PublicKey,
  instruction: TransactionInstruction,
  description?: string,
): Promise<MultisigTransaction> {
  const multisigAccount = await getMultisig(connection, multisig)

  if (!multisigAccount) {
    throw new Error('Multisig account not found')
  }

  const id = generateTransactionId()

  const transaction: MultisigTransaction = {
    id,
    multisig,
    instruction: Buffer.from(instruction.data),
    signers: multisigAccount.signers,
    signatures: new Map(),
    executed: false,
    createdAt: new Date(),
  }

  pendingTransactions.set(id, transaction)

  return transaction
}

/**
 * Sign a multi-sig transaction
 */
export async function signMultisigTransaction(
  connection: Connection,
  options: SignTransactionOptions,
): Promise<{ signed: boolean, remainingSignatures: number }> {
  const { transactionId, signer } = options

  const transaction = pendingTransactions.get(transactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.executed) {
    throw new Error('Transaction already executed')
  }

  // Check if signer is authorized
  const isAuthorized = transaction.signers.some(s => s.equals(signer.publicKey))
  if (!isAuthorized) {
    throw new Error('Signer not authorized for this multisig')
  }

  // Check if already signed
  if (transaction.signatures.has(signer.publicKey.toBase58())) {
    throw new Error('Already signed by this signer')
  }

  // Add signature (simplified - in production would sign actual transaction)
  const signature = Buffer.from(`sig_${signer.publicKey.toBase58().slice(0, 8)}`)
  transaction.signatures.set(signer.publicKey.toBase58(), signature)

  const multisigAccount = await getMultisig(connection, transaction.multisig)
  const remainingSignatures = multisigAccount
    ? multisigAccount.m - transaction.signatures.size
    : 0

  return {
    signed: true,
    remainingSignatures: Math.max(0, remainingSignatures),
  }
}

/**
 * Execute a multi-sig transaction
 */
export async function executeMultisigTransaction(
  connection: Connection,
  options: ExecuteMultisigOptions,
): Promise<{ signature: string }> {
  const { transactionId } = options

  const transaction = pendingTransactions.get(transactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.executed) {
    throw new Error('Transaction already executed')
  }

  const multisigAccount = await getMultisig(connection, transaction.multisig)

  if (!multisigAccount) {
    throw new Error('Multisig account not found')
  }

  // Check if enough signatures
  if (transaction.signatures.size < multisigAccount.m) {
    throw new Error(
      `Not enough signatures: ${transaction.signatures.size}/${multisigAccount.m}`,
    )
  }

  // Mark as executed
  transaction.executed = true

  // In production, would actually execute the transaction
  return {
    signature: `executed_${transactionId}`,
  }
}

/**
 * Get pending signatures for a multi-sig
 */
export async function getPendingSignatures(
  connection: Connection,
  multisig: PublicKey,
): Promise<PendingSignature[]> {
  const multisigAccount = await getMultisig(connection, multisig)

  if (!multisigAccount) {
    return []
  }

  const pending: PendingSignature[] = []

  for (const [id, tx] of pendingTransactions) {
    if (tx.multisig.equals(multisig) && !tx.executed) {
      pending.push({
        transactionId: id,
        multisig,
        description: `Transaction ${id}`,
        requiredSignatures: multisigAccount.m,
        currentSignatures: tx.signatures.size,
        signers: multisigAccount.signers.map(s => ({
          address: s,
          signed: tx.signatures.has(s.toBase58()),
        })),
        createdAt: tx.createdAt,
      })
    }
  }

  return pending
}

/**
 * Cancel a pending multi-sig transaction
 */
export function cancelMultisigTransaction(transactionId: string): boolean {
  const transaction = pendingTransactions.get(transactionId)

  if (!transaction) {
    return false
  }

  if (transaction.executed) {
    return false
  }

  pendingTransactions.delete(transactionId)
  return true
}

/**
 * Check if transaction can be executed
 */
export async function canExecute(
  connection: Connection,
  transactionId: string,
): Promise<{ canExecute: boolean, reason?: string }> {
  const transaction = pendingTransactions.get(transactionId)

  if (!transaction) {
    return { canExecute: false, reason: 'Transaction not found' }
  }

  if (transaction.executed) {
    return { canExecute: false, reason: 'Already executed' }
  }

  const multisigAccount = await getMultisig(connection, transaction.multisig)

  if (!multisigAccount) {
    return { canExecute: false, reason: 'Multisig not found' }
  }

  if (transaction.signatures.size < multisigAccount.m) {
    return {
      canExecute: false,
      reason: `Need ${multisigAccount.m - transaction.signatures.size} more signatures`,
    }
  }

  return { canExecute: true }
}

/**
 * Generate unique transaction ID
 */
function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
