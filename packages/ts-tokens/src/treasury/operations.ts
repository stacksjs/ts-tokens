/**
 * Treasury Operations
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js'
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { getMintWithProgram } from '../token/program'
import type {
  DepositOptions,
  WithdrawalOptions,
  TreasuryTransaction,
  SpendingProposal,
  SpendingLimit,
} from './types'

/**
 * Deposit tokens to a treasury.
 *
 * Performs a real SPL token transfer from the depositor's associated token
 * account into the treasury's associated token account. The loaded wallet
 * (from config) must be the owner of the source account and signs the transfer.
 *
 * @returns The confirmed transaction signature
 */
export async function deposit(
  config: TokenConfig,
  options: DepositOptions
): Promise<string> {
  const { treasury, mint, amount, from } = options

  const connection = createConnection(config)
  const payer = loadWallet(config)

  const { mint: mintInfo, programId } = await getMintWithProgram(connection, mint)

  const sourceAta = await getAssociatedTokenAddress(mint, from, false, programId)
  const treasuryAta = await getAssociatedTokenAddress(mint, treasury, true, programId)

  // Idempotently ensure the treasury's token account exists, then transfer.
  const instructions = [
    createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey,
      treasuryAta,
      treasury,
      mint,
      programId
    ),
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      treasuryAta,
      from,
      amount,
      mintInfo.decimals,
      [],
      programId
    ),
  ]

  const transaction = await buildTransaction(connection, instructions, payer.publicKey)
  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)
  if (!result.confirmed) {
    throw new Error(`Deposit failed: ${result.error ?? 'transaction not confirmed'}`)
  }
  return result.signature
}

/**
 * Withdraw tokens from a treasury.
 *
 * Performs a real SPL token transfer from the treasury's associated token
 * account to the recipient. The loaded wallet (from config) must be the
 * treasury authority and signs the transfer.
 *
 * A withdrawal must be authorised by an approved spending proposal. Because the
 * governance program that stores proposal state is not deployed, the approval
 * cannot be verified on-chain — so this refuses rather than moving funds on an
 * unverifiable proposal.
 *
 * @returns The confirmed transaction signature
 */
export async function withdraw(
  config: TokenConfig,
  options: WithdrawalOptions
): Promise<string> {
  const { treasury, mint, amount, to, proposalId } = options

  const connection = createConnection(config)

  // A withdrawal is gated on an approved proposal. getSpendingProposal is a
  // stub (governance program undeployed), so approval cannot be confirmed.
  // Refuse rather than releasing funds against an unverifiable proposal.
  const proposal = await getSpendingProposal(connection, proposalId)
  if (!proposal) {
    throw new Error(
      `Cannot verify spending proposal ${proposalId.toBase58()}: the governance ` +
      `program that stores proposal state is not deployed. Withdrawal refused.`
    )
  }
  if (proposal.status !== 'approved') {
    throw new Error(
      `Spending proposal ${proposalId.toBase58()} is not approved ` +
      `(status: ${proposal.status})`
    )
  }

  const payer = loadWallet(config)

  const { mint: mintInfo, programId } = await getMintWithProgram(connection, mint)

  const treasuryAta = await getAssociatedTokenAddress(mint, treasury, true, programId)
  const destAta = await getAssociatedTokenAddress(mint, to, false, programId)

  const instructions = [
    createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey,
      destAta,
      to,
      mint,
      programId
    ),
    createTransferCheckedInstruction(
      treasuryAta,
      mint,
      destAta,
      payer.publicKey,
      amount,
      mintInfo.decimals,
      [],
      programId
    ),
  ]

  const transaction = await buildTransaction(connection, instructions, payer.publicKey)
  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)
  if (!result.confirmed) {
    throw new Error(`Withdrawal failed: ${result.error ?? 'transaction not confirmed'}`)
  }
  return result.signature
}

/**
 * Create spending proposal
 */
export async function createSpendingProposal(
  _connection: Connection,
  _treasury: PublicKey,
  _recipient: PublicKey,
  _mint: PublicKey,
  _amount: bigint,
  _description: string
): Promise<{ proposalId: PublicKey; signature: string }> {
  // Depends on the governance program (undeployed) to persist proposal state.
  // Returning a fabricated proposalId/signature would let callers record a
  // proposal that does not exist on-chain, so fail loudly instead.
  throw new Error(
    'createSpendingProposal is not implemented: the governance program that ' +
    'stores spending proposals is not deployed.'
  )
}

/**
 * Execute approved spending proposal.
 *
 * Depends on the governance program (undeployed) to load and validate proposal
 * state before releasing funds. Throws rather than returning a fabricated
 * signature for a withdrawal that never happened.
 */
export async function executeSpendingProposal(
  _connection: Connection,
  proposalId: PublicKey
): Promise<string> {
  throw new Error(
    `executeSpendingProposal is not implemented: the governance program that ` +
    `stores proposal ${proposalId.toBase58()} is not deployed.`
  )
}

/**
 * Get spending proposal
 */
export async function getSpendingProposal(
  _connection: Connection,
  _proposalId: PublicKey
): Promise<SpendingProposal | null> {
  // In production, would fetch proposal
  return null
}

/**
 * Get pending spending proposals
 */
export async function getPendingProposals(
  _connection: Connection,
  _treasury: PublicKey
): Promise<SpendingProposal[]> {
  // In production, would fetch pending proposals
  return []
}

/**
 * Get _treasury transaction history
 */
export async function getTransactionHistory(
  _connection: Connection,
  _treasury: PublicKey,
  _options: { limit?: number; before?: string } = {}
): Promise<TreasuryTransaction[]> {
  // In production, would fetch transaction history
  return []
}

/**
 * Set spending limits
 */
export async function setSpendingLimits(
  _connection: Connection,
  _treasury: PublicKey,
  _authority: PublicKey,
  _limits: Omit<SpendingLimit, 'currentDailySpent' | 'currentWeeklySpent' | 'currentMonthlySpent'>
): Promise<string> {
  // Spending limits live in governance program state, which is not deployed.
  // Throw rather than returning a fabricated signature that implies the limits
  // were persisted on-chain.
  throw new Error(
    'setSpendingLimits is not implemented: the governance program that stores ' +
    'spending limits is not deployed.'
  )
}

/**
 * Get spending limits
 */
export async function getSpendingLimits(
  _connection: Connection,
  _treasury: PublicKey,
  _mint: PublicKey
): Promise<SpendingLimit | null> {
  // In production, would fetch spending limits
  return null
}

/**
 * Check if withdrawal is within limits
 */
export async function checkWithdrawalLimits(
  connection: Connection,
  treasury: PublicKey,
  mint: PublicKey,
  amount: bigint
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getSpendingLimits(connection, treasury, mint)

  // getSpendingLimits is a stub (governance program undeployed) and always
  // returns null, meaning the limits are unknown. Fail closed rather than
  // silently allowing an unbounded withdrawal.
  if (!limits) {
    return {
      allowed: false,
      reason:
        'Spending limits are unknown (governance program not deployed); ' +
        'withdrawal cannot be authorised.',
    }
  }

  if (limits.currentDailySpent + amount > limits.dailyLimit) {
    return { allowed: false, reason: 'Daily spending limit exceeded' }
  }

  if (limits.currentWeeklySpent + amount > limits.weeklyLimit) {
    return { allowed: false, reason: 'Weekly spending limit exceeded' }
  }

  if (limits.currentMonthlySpent + amount > limits.monthlyLimit) {
    return { allowed: false, reason: 'Monthly spending limit exceeded' }
  }

  return { allowed: true }
}

/**
 * Get _treasury token accounts
 */
export async function getTreasuryTokenAccounts(
  _connection: Connection,
  _treasury: PublicKey
): Promise<Array<{ mint: PublicKey; account: PublicKey; balance: bigint }>> {
  // In production, would fetch all token accounts
  return []
}

/**
 * Close empty _treasury token account
 */
export async function closeEmptyTokenAccount(
  _connection: Connection,
  _treasury: PublicKey,
  _tokenAccount: PublicKey,
  _authority: PublicKey
): Promise<string> {
  // This overload only receives public keys, so there is no signer to
  // authorize the close. Returning a fabricated signature would imply an
  // account was closed when nothing happened — use closeTokenAccount(account,
  // config) from the token module, which loads a wallet and sends a real
  // CloseAccount instruction.
  throw new Error(
    'closeEmptyTokenAccount is not implemented here (no signer available); ' +
    'use closeTokenAccount from ts-tokens/token with a configured wallet.'
  )
}

/**
 * Calculate treasury value in USD
 */
export async function calculateTreasuryValue(
  connection: Connection,
  treasury: PublicKey,
  getPriceUsd: (mint: PublicKey) => Promise<number>
): Promise<number> {
  const accounts = await getTreasuryTokenAccounts(connection, treasury)

  let totalValue = 0
  for (const account of accounts) {
    const price = await getPriceUsd(account.mint)
    // balance is in base units; convert to whole tokens using the mint's
    // decimals before applying the USD price. Skipping this inflates the value
    // by 10^decimals.
    const { mint: mintInfo } = await getMintWithProgram(connection, account.mint)
    const uiAmount = Number(account.balance) / 10 ** mintInfo.decimals
    totalValue += uiAmount * price
  }

  return totalValue
}

/**
 * Format transaction for display
 */
export function formatTransaction(tx: TreasuryTransaction): string {
  const amount = tx.amount.toString()
  const date = new Date(tx.timestamp * 1000).toISOString()

  if (tx.type === 'deposit') {
    return `[${date}] Deposit: ${amount} from ${tx.from?.toBase58().slice(0, 8)}...`
  } else {
    return `[${date}] Withdrawal: ${amount} to ${tx.to?.toBase58().slice(0, 8)}...`
  }
}
