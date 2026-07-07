/**
 * Delegation Queries
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { Delegation } from '../types'

/**
 * Get delegation info.
 *
 * Delegation accounts are owned by the governance program, which is not
 * deployed. Returning null would be indistinguishable from "no delegation
 * exists", so this throws instead.
 */
export async function getDelegation(
  _connection: Connection,
  _dao: PublicKey,
  _delegator: PublicKey
): Promise<Delegation | null> {
  throw new Error(
    'getDelegation is not implemented: the governance program that owns ' +
    'delegation accounts is not deployed, so delegations cannot be read.'
  )
}

/**
 * Get all delegations received by a delegate.
 *
 * Would rely on getProgramAccounts against the undeployed governance program.
 * Returning an empty array would falsely imply "no delegations", so this throws.
 */
export async function getDelegationsForDelegate(
  _connection: Connection,
  _dao: PublicKey,
  _delegate: PublicKey
): Promise<Delegation[]> {
  throw new Error(
    'getDelegationsForDelegate is not implemented: the governance program that ' +
    'owns delegation accounts is not deployed, so delegations cannot be listed.'
  )
}

/**
 * Get all delegations made by a delegator.
 *
 * Would rely on getProgramAccounts against the undeployed governance program.
 * Returning an empty array would falsely imply "no delegations", so this throws.
 */
export async function getDelegationsFromDelegator(
  _connection: Connection,
  _dao: PublicKey,
  _delegator: PublicKey
): Promise<Delegation[]> {
  throw new Error(
    'getDelegationsFromDelegator is not implemented: the governance program ' +
    'that owns delegation accounts is not deployed, so delegations cannot be ' +
    'listed.'
  )
}

/**
 * Get total active delegated power for a delegate.
 *
 * Sums only delegations that have not expired (an expiry of <= now no longer
 * confers voting power). This delegates to getDelegationsForDelegate, which
 * throws while the governance program is undeployed; the expiry-aware reduce is
 * the correct behaviour once real delegation data is available.
 */
export async function getTotalDelegatedPower(
  connection: Connection,
  dao: PublicKey,
  delegate: PublicKey
): Promise<bigint> {
  const delegations = await getDelegationsForDelegate(connection, dao, delegate)
  const now = BigInt(Math.floor(Date.now() / 1000))
  return delegations.reduce(
    (total, d) => (d.expiresAt !== undefined && d.expiresAt <= now ? total : total + d.amount),
    0n,
  )
}
