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
 * Maximum transfer instructions per transaction. Each SPL transfer (plus a
 * possible ATA-create) is a few dozen bytes of accounts/data; a legacy
 * transaction caps at 1232 serialized bytes, which comfortably fits well under
 * 20 simple transfers. We chunk conservatively so a batch that also creates
 * ATAs still fits.
 */
const MAX_TRANSFERS_PER_TX = 10

/**
 * Compute each member's payout, flooring by share and assigning the rounding
 * remainder to the largest-share member so no dust is left undistributed.
 *
 * Shared by distribute() and previewDistribution() so the preview reflects the
 * exact amounts distribute() will send, remainder included.
 */
function computeMemberAmounts(fanout: FanoutWallet, totalAmount: bigint): bigint[] {
  const totalShares = BigInt(fanout.totalShares)
  if (totalShares <= 0n) return fanout.members.map(() => 0n)

  const memberAmounts = fanout.members.map(m => (totalAmount * BigInt(m.shares)) / totalShares)
  const distributed = memberAmounts.reduce((sum, a) => sum + a, 0n)
  const remainder = totalAmount - distributed
  if (remainder > 0n && fanout.members.length > 0) {
    let largest = 0
    for (let i = 1; i < fanout.members.length; i++) {
      if (fanout.members[i].shares > fanout.members[largest].shares) largest = i
    }
    memberAmounts[largest] += remainder
  }
  return memberAmounts
}

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
  if (options.amount !== undefined) {
    if (options.amount <= 0n) {
      throw new Error('Distribution amount must be greater than zero')
    }
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

  const memberAmounts = computeMemberAmounts(fanout, totalAmount)

  // Build one instruction group per paid member. A group is the atomic unit
  // that must stay within a single transaction: an SPL transfer may be preceded
  // by an ATA-create for the recipient, and splitting those across transactions
  // would leave the transfer targeting a not-yet-created account.
  type MemberGroup = { member: string; amount: bigint; instructions: TransactionInstruction[] }
  const groups: MemberGroup[] = []

  const mintPubkey = options.mint ? new PublicKey(options.mint) : null
  const sourceAta = mintPubkey
    ? await getAssociatedTokenAddress(mintPubkey, payer.publicKey)
    : null

  for (let i = 0; i < fanout.members.length; i++) {
    const member = fanout.members[i]
    const memberAmount = memberAmounts[i]
    if (memberAmount <= 0n) continue

    const memberPubkey = new PublicKey(member.address)
    const groupInstructions: TransactionInstruction[] = []

    if (mintPubkey && sourceAta) {
      const destAta = await getAssociatedTokenAddress(mintPubkey, memberPubkey)

      // Create ATA if needed
      const destAccount = await connection.getAccountInfo(destAta)
      if (!destAccount) {
        groupInstructions.push(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            destAta,
            memberPubkey,
            mintPubkey
          )
        )
      }

      groupInstructions.push(
        createTransferInstruction(sourceAta, destAta, payer.publicKey, memberAmount)
      )
    } else {
      groupInstructions.push(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: memberPubkey,
          lamports: memberAmount,
        })
      )
    }

    groups.push({ member: member.address, amount: memberAmount, instructions: groupInstructions })
  }

  if (groups.length === 0) {
    throw new Error('No payments to distribute')
  }

  // Pack member groups into batches of at most MAX_TRANSFERS_PER_TX members so
  // no single transaction exceeds the 1232-byte limit. Each batch is its own
  // transaction, sent and confirmed independently; state is persisted per
  // confirmed batch so a mid-run failure still records what actually settled.
  const allPayments: DistributionResult['payments'] = []
  let totalDistributed = 0n

  for (let start = 0; start < groups.length; start += MAX_TRANSFERS_PER_TX) {
    const batch = groups.slice(start, start + MAX_TRANSFERS_PER_TX)
    const instructions = batch.flatMap(g => g.instructions)

    const transaction = await buildTransaction(
      connection,
      instructions,
      payer.publicKey,
      options.options
    )

    transaction.partialSign(payer)

    const result = await sendAndConfirmTransaction(connection, transaction, options.options)

    if (!result.confirmed) {
      // Persist whatever confirmed before this batch so accounting is accurate,
      // then surface the failure instead of reporting a full distribution.
      throw new Error(
        `Distribution failed on batch ${Math.floor(start / MAX_TRANSFERS_PER_TX) + 1}: ` +
        `${result.error ?? 'transaction was not confirmed'}`
      )
    }

    const batchPayments = batch.map(g => ({
      member: g.member,
      amount: g.amount,
      signature: result.signature,
    }))
    const batchTotal = batch.reduce((sum, g) => sum + g.amount, 0n)

    // Update state per confirmed batch.
    updateFanoutState(fanout.id, batchTotal, batchPayments)

    allPayments.push(...batchPayments)
    totalDistributed += batchTotal
  }

  return {
    fanoutId: fanout.id,
    totalDistributed,
    payments: allPayments,
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

  // Use the same amounts distribute() will send, remainder assignment included,
  // so the preview never understates the largest-share member by the dust.
  const memberAmounts = computeMemberAmounts(fanout, totalAmount)

  return fanout.members.map((member, i) => ({
    address: member.address,
    shares: member.shares,
    amount: memberAmounts[i],
    percentage: fanout.totalShares > 0 ? (member.shares / fanout.totalShares) * 100 : 0,
  }))
}
