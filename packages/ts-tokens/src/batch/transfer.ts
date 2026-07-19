/**
 * Batch Transfer Operations
 */

import type {
  Connection,
  TransactionInstruction} from '@solana/web3.js';
import {
  PublicKey,
  Transaction
} from '@solana/web3.js'
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import type {
  BatchTransferOptions,
  BatchTransferResult,
  BatchTransferRecipient,
} from './types'

/**
 * Execute batch token transfers
 *
 * NOTE: This function only receives the payer's `PublicKey`, not a signing
 * `Keypair`, so it cannot sign or submit transactions. Signing/submitting
 * batches is intentionally not implemented here. Use `prepareBatchTransfer`
 * to build the instructions and sign/send them with a wallet, or use the
 * config-driven ALT path (`batchTransferWithALT`) which loads a wallet.
 */
// eslint-disable-next-line pickier/no-unused-vars
export async function batchTransfer(
  connection: Connection,
  payer: PublicKey,
  options: BatchTransferOptions
): Promise<BatchTransferResult> {
  throw new Error(
    'batchTransfer is not implemented: it receives only a payer PublicKey and ' +
    'cannot sign or send transactions. Build instructions with ' +
    'prepareBatchTransfer() and sign/send them with a Keypair wallet, or use ' +
    'batchTransferWithALT() which loads a signing wallet from config.'
  )
}

/**
 * Prepare batch transfer instructions without executing
 */
export async function prepareBatchTransfer(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  recipients: BatchTransferRecipient[]
): Promise<TransactionInstruction[]> {
  const instructions: TransactionInstruction[] = []
  const sourceAta = await getAssociatedTokenAddress(mint, payer)

  for (const recipient of recipients) {
    const recipientPubkey = typeof recipient.address === 'string'
      ? new PublicKey(recipient.address)
      : recipient.address

    const destAta = await getAssociatedTokenAddress(mint, recipientPubkey)

    // Check if ATA exists
    const destAccount = await connection.getAccountInfo(destAta)
    if (!destAccount) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          payer,
          destAta,
          recipientPubkey,
          mint
        )
      )
    }

    instructions.push(
      createTransferInstruction(
        sourceAta,
        destAta,
        payer,
        recipient.amount
      )
    )
  }

  return instructions
}

/**
 * Estimate batch transfer cost
 */
export async function estimateBatchTransferCost(
  connection: Connection,
  recipientCount: number,
  needsAtaCreation: number
): Promise<{ lamports: number; sol: number }> {
  const rentExempt = await connection.getMinimumBalanceForRentExemption(165)
  const txFee = 5000 // ~0.000005 SOL per signature

  const ataCreationCost = rentExempt * needsAtaCreation
  const transactionFees = txFee * Math.ceil(recipientCount / 5) // ~5 per tx

  const totalLamports = ataCreationCost + transactionFees

  return {
    lamports: totalLamports,
    sol: totalLamports / 1e9,
  }
}

/**
 * Validate batch transfer recipients
 */
export function validateBatchRecipients(
  recipients: BatchTransferRecipient[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (recipients.length === 0) {
    errors.push('No recipients provided')
  }

  if (recipients.length > 1000) {
    errors.push('Maximum 1000 recipients per batch')
  }

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i]

    try {
      if (typeof r.address === 'string') {
        new PublicKey(r.address)
      }
    } catch {
      errors.push(`Invalid address at index ${i}: ${r.address}`)
    }

    if (r.amount <= 0n) {
      errors.push(`Invalid amount at index ${i}: must be positive`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
