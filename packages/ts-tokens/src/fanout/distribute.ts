/**
 * Fanout Distribution
 *
 * Distribute SOL/SPL tokens to all members based on their shares.
 */

import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import type { TransactionInstruction } from '@solana/web3.js'
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import type { TokenConfig } from '../types'
import type { DistributeOptions, DistributionResult, FanoutWallet } from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { getFanoutWallet, loadFanoutState, saveFanoutState } from './create'

/**
 * Distribute funds to all fanout members based on their shares
 */
export async function distribute(
  options: DistributeOptions,
  config: TokenConfig
): Promise<DistributionResult> {
  const fanout = getFanoutWallet(options.fanoutId)
  if (!fanout) {
    throw new Error(`Fanout wallet not found: ${options.fanoutId}`)
  }

  const connection = createConnection(config)
  const payer = loadWallet(config)

  // Determine total amount to distribute
  let totalAmount: bigint
  if (options.amount) {
    totalAmount = options.amount
  } else if (options.mint) {
    // SPL token — get payer's balance
    const ata = await getAssociatedTokenAddress(
      new PublicKey(options.mint),
      payer.publicKey
    )
    const balance = await connection.getTokenAccountBalance(ata)
    totalAmount = BigInt(balance.value.amount)
  } else {
    // SOL — use payer's balance minus rent
    const balance = await connection.getBalance(payer.publicKey)
    totalAmount = BigInt(balance) - BigInt(LAMPORTS_PER_SOL / 100) // Reserve 0.01 SOL for fees
  }

  if (totalAmount <= 0n) {
    throw new Error('No funds available to distribute')
  }

  const payments: DistributionResult['payments'] = []
  const instructions: TransactionInstruction[] = []

  for (const member of fanout.members) {
    const memberAmount = (totalAmount * BigInt(member.shares)) / BigInt(fanout.totalShares)
    if (memberAmount <= 0n) continue

    const memberPubkey = new PublicKey(member.address)

    if (options.mint) {
      // SPL token transfer
      const mintPubkey = new PublicKey(options.mint)
      const sourceAta = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)
      const destAta = await getAssociatedTokenAddress(mintPubkey, memberPubkey)

      // Create ATA if needed
      const destAccount = await connection.getAccountInfo(destAta)
      if (!destAccount) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            destAta,
            memberPubkey,
            mintPubkey
          )
        )
      }

      instructions.push(
        createTransferInstruction(
          sourceAta,
          destAta,
          payer.publicKey,
          memberAmount
        )
      )
    } else {
      // SOL transfer
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: memberPubkey,
          lamports: memberAmount,
        })
      )
    }

    payments.push({
      member: member.address,
      amount: memberAmount,
      signature: '', // Will be set after send
    })
  }

  if (instructions.length === 0) {
    throw new Error('No payments to distribute')
  }

  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options.options
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options.options)

  // Update all payment signatures
  for (const payment of payments) {
    payment.signature = result.signature
  }

  // Update state
  const totalDistributed = payments.reduce((sum, p) => sum + p.amount, 0n)
  updateFanoutState(fanout.id, totalDistributed, payments)

  return {
    fanoutId: fanout.id,
    totalDistributed,
    payments,
  }
}

/**
 * Update fanout state after distribution
 */
function updateFanoutState(
  fanoutId: string,
  totalDistributed: bigint,
  payments: DistributionResult['payments']
): void {
  const state = loadFanoutState()
  const wallet = state.wallets[fanoutId]
  if (!wallet) return

  wallet.totalDistributed = (BigInt(wallet.totalDistributed) + totalDistributed).toString()

  for (const payment of payments) {
    const member = wallet.members.find(m => m.address === payment.member)
    if (member) {
      member.totalClaimed = (BigInt(member.totalClaimed) + payment.amount).toString()
    }
  }

  saveFanoutState(state)
}

/**
 * Calculate distribution amounts for preview
 */
export function previewDistribution(
  fanoutId: string,
  totalAmount: bigint
): Array<{ address: string; shares: number; amount: bigint; percentage: number }> {
  const fanout = getFanoutWallet(fanoutId)
  if (!fanout) return []

  return fanout.members.map(member => {
    const amount = (totalAmount * BigInt(member.shares)) / BigInt(fanout.totalShares)
    const percentage = (member.shares / fanout.totalShares) * 100

    return {
      address: member.address,
      shares: member.shares,
      amount,
      percentage,
    }
  })
}
