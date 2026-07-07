/**
 * Delegation Operations
 */

import type { Connection, Keypair } from '@solana/web3.js'
import type { Delegation, DelegateOptions, UndelegateOptions, AcceptDelegationOptions } from '../types'

/**
 * Delegate voting power.
 *
 * Validates the delegation inputs first (a voter cannot delegate to themselves,
 * and any expiry must be in the future) so callers get a meaningful error, then
 * throws: the governance program that stores delegation accounts is not
 * deployed, so no delegation is recorded on-chain.
 */
export async function delegateVotingPower(
  _connection: Connection,
  delegator: Keypair,
  options: DelegateOptions
): Promise<{ delegation: Delegation; signature: string }> {
  const { delegate, expiresAt } = options

  if (delegate.equals(delegator.publicKey)) {
    throw new Error('Cannot delegate voting power to yourself')
  }
  if (expiresAt !== undefined) {
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (expiresAt <= now) {
      throw new Error('Delegation expiry must be in the future')
    }
  }

  throw new Error(
    'delegateVotingPower is not implemented: the governance program that stores ' +
    'delegation accounts is not deployed. No delegation was recorded on-chain.'
  )
}

/**
 * Remove delegation.
 *
 * Depends on the governance program (undeployed) to close the delegation
 * account, so this throws rather than returning a fabricated signature.
 */
export async function undelegateVotingPower(
  _connection: Connection,
  _delegator: Keypair,
  _options: UndelegateOptions
): Promise<{ signature: string }> {
  throw new Error(
    'undelegateVotingPower is not implemented: the governance program that ' +
    'stores delegation accounts is not deployed. No delegation was removed ' +
    'on-chain.'
  )
}

/**
 * Accept a delegation (optional confirmation step).
 *
 * Depends on the governance program (undeployed) to mutate the delegation
 * account, so this throws rather than returning a fabricated signature.
 */
export async function acceptDelegation(
  _connection: Connection,
  _delegate: Keypair,
  _options: AcceptDelegationOptions
): Promise<{ signature: string }> {
  throw new Error(
    'acceptDelegation is not implemented: the governance program that stores ' +
    'delegation accounts is not deployed. No delegation was accepted on-chain.'
  )
}
