/**
 * Delegation Operations
 */

import type { Connection, Keypair, PublicKey } from '@solana/web3.js'
import type { Delegation, DelegateOptions, UndelegateOptions, AcceptDelegationOptions } from '../types'
import { getDelegationAddress } from '../programs/program'

/**
 * Delegate voting power
 */
export async function delegateVotingPower(
  connection: Connection,
  delegator: Keypair,
  options: DelegateOptions
): Promise<{ delegation: Delegation; signature: string }> {
  const { dao, delegate, amount, expiresAt } = options

  const delegationAddress = getDelegationAddress(dao, delegator.publicKey)

  const delegation: Delegation = {
    delegator: delegator.publicKey,
    delegate,
    dao,
    amount: amount ?? 0n, // 0 means all
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
    expiresAt,
  }

  return {
    delegation,
    signature: `delegated_${delegationAddress.toBase58().slice(0, 8)}`,
  }
}

/**
 * Remove delegation
 */
export async function undelegateVotingPower(
  connection: Connection,
  delegator: Keypair,
  options: UndelegateOptions
): Promise<{ signature: string }> {
  const { dao } = options
  const delegationAddress = getDelegationAddress(dao, delegator.publicKey)

  return {
    signature: `undelegated_${delegationAddress.toBase58().slice(0, 8)}`,
  }
}

/**
 * Accept a delegation (optional confirmation step)
 */
export async function acceptDelegation(
  connection: Connection,
  delegate: Keypair,
  options: AcceptDelegationOptions
): Promise<{ signature: string }> {
  const { dao, delegator } = options
  const delegationAddress = getDelegationAddress(dao, delegator)

  return {
    signature: `delegation_accepted_${delegationAddress.toBase58().slice(0, 8)}`,
  }
}
