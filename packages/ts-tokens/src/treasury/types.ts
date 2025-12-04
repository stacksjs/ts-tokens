/**
 * Treasury Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Treasury account
 */
export interface Treasury {
  address: PublicKey
  dao: PublicKey
  authority: PublicKey
  balances: TreasuryBalance[]
  totalValueUsd?: number
  createdAt: number
}

/**
 * Treasury balance for a single token
 */
export interface TreasuryBalance {
  mint: PublicKey
  amount: bigint
  decimals: number
  tokenAccount: PublicKey
  valueUsd?: number
}

/**
 * Create treasury options
 */
export interface CreateTreasuryOptions {
  dao: PublicKey
  authority?: PublicKey
  initialDeposit?: {
    mint: PublicKey
    amount: bigint
  }
}

/**
 * Deposit options
 */
export interface DepositOptions {
  treasury: PublicKey
  mint: PublicKey
  amount: bigint
  from: PublicKey
}

/**
 * Withdrawal options (requires governance approval)
 */
export interface WithdrawalOptions {
  treasury: PublicKey
  mint: PublicKey
  amount: bigint
  to: PublicKey
  proposalId: PublicKey
}

/**
 * Treasury spending proposal
 */
export interface SpendingProposal {
  id: PublicKey
  treasury: PublicKey
  recipient: PublicKey
  mint: PublicKey
  amount: bigint
  description: string
  status: 'pending' | 'approved' | 'executed' | 'rejected'
  approvedAt?: number
  executedAt?: number
}

/**
 * Treasury transaction
 */
export interface TreasuryTransaction {
  signature: string
  type: 'deposit' | 'withdrawal'
  mint: PublicKey
  amount: bigint
  from?: PublicKey
  to?: PublicKey
  timestamp: number
  proposalId?: PublicKey
}

/**
 * Treasury stats
 */
export interface TreasuryStats {
  totalDeposits: bigint
  totalWithdrawals: bigint
  transactionCount: number
  uniqueDepositors: number
  tokenCount: number
}

/**
 * Spending limit
 */
export interface SpendingLimit {
  mint: PublicKey
  dailyLimit: bigint
  weeklyLimit: bigint
  monthlyLimit: bigint
  currentDailySpent: bigint
  currentWeeklySpent: bigint
  currentMonthlySpent: bigint
}
