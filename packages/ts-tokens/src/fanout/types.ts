/**
 * Fanout Wallet Types
 *
 * Types for revenue/royalty distribution via fanout wallets.
 */

import type { TransactionOptions } from '../types/transaction'

/**
 * Membership model for fanout wallets
 */
export type MembershipModel = 'wallet' | 'nft' | 'token'

/**
 * Fanout wallet
 */
export interface FanoutWallet {
  id: string
  name: string
  authority: string
  membershipModel: MembershipModel
  members: FanoutMember[]
  totalShares: number
  totalInflow: bigint
  totalDistributed: bigint
  mint?: string
  createdAt: number
}

/**
 * Fanout member
 */
export interface FanoutMember {
  address: string
  shares: number
  totalClaimed: bigint
}

/**
 * Options for creating a fanout wallet
 */
export interface CreateFanoutOptions {
  name: string
  membershipModel: MembershipModel
  members: Array<{ address: string; shares: number }>
  mint?: string
  options?: TransactionOptions
}

/**
 * Options for distributing from a fanout wallet
 */
export interface DistributeOptions {
  fanoutId: string
  amount?: bigint
  mint?: string
  options?: TransactionOptions
}

/**
 * Distribution result
 */
export interface DistributionResult {
  fanoutId: string
  totalDistributed: bigint
  payments: Array<{
    member: string
    amount: bigint
    signature: string
  }>
}

/**
 * Serialized fanout wallet for JSON persistence
 */
export interface SerializedFanoutWallet {
  id: string
  name: string
  authority: string
  membershipModel: MembershipModel
  members: Array<{
    address: string
    shares: number
    totalClaimed: string
  }>
  totalShares: number
  totalInflow: string
  totalDistributed: string
  mint?: string
  createdAt: number
}

/**
 * Fanout state file
 */
export interface FanoutState {
  wallets: Record<string, SerializedFanoutWallet>
}
