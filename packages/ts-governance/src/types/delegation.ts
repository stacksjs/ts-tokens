/**
 * Delegation Types
 */

import type { PublicKey } from '@solana/web3.js'

export interface Delegation {
  delegator: PublicKey
  delegate: PublicKey
  dao: PublicKey
  amount: bigint
  timestamp: bigint
  expiresAt?: bigint
}

export interface DelegateOptions {
  dao: PublicKey
  delegate: PublicKey
  amount?: bigint
  expiresAt?: bigint
}

export interface UndelegateOptions {
  dao: PublicKey
}

export interface AcceptDelegationOptions {
  dao: PublicKey
  delegator: PublicKey
}
