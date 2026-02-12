/**
 * Delegation Queries
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { Delegation } from '../types'

/**
 * Get delegation info
 */
export async function getDelegation(
  connection: Connection,
  dao: PublicKey,
  delegator: PublicKey
): Promise<Delegation | null> {
  // In production, would query delegation PDA account
  return null
}

/**
 * Get all delegations received by a delegate
 */
export async function getDelegationsForDelegate(
  connection: Connection,
  dao: PublicKey,
  delegate: PublicKey
): Promise<Delegation[]> {
  // In production, would use getProgramAccounts with filters
  return []
}

/**
 * Get all delegations made by a delegator
 */
export async function getDelegationsFromDelegator(
  connection: Connection,
  dao: PublicKey,
  delegator: PublicKey
): Promise<Delegation[]> {
  // In production, would use getProgramAccounts with filters
  return []
}

/**
 * Get total delegated power for a delegate
 */
export async function getTotalDelegatedPower(
  connection: Connection,
  dao: PublicKey,
  delegate: PublicKey
): Promise<bigint> {
  const delegations = await getDelegationsForDelegate(connection, dao, delegate)
  return delegations.reduce((total, d) => total + d.amount, 0n)
}
