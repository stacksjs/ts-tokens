/**
 * Treasury Types
 */

import type { PublicKey } from '@solana/web3.js'

export interface Treasury {
  address: PublicKey
  dao: PublicKey
  solBalance: bigint
  tokenBalances: TokenBalance[]
  createdAt: bigint
}

export interface TokenBalance {
  mint: PublicKey
  amount: bigint
}

export interface CreateTreasuryOptions {
  dao: PublicKey
}

export interface DepositOptions {
  dao: PublicKey
  amount: bigint
  mint?: PublicKey
}

export interface WithdrawOptions {
  dao: PublicKey
  recipient: PublicKey
  amount: bigint
  mint?: PublicKey
}
