/**
 * Staking Integration
 *
 * Derive voting power from staked tokens using ts-tokens/staking.
 */

import type { Connection, PublicKey } from '@solana/web3.js'

/**
 * Get voting power from staked tokens
 */
export async function getStakedVotingPower(
  _connection: Connection,
  _voter: PublicKey,
  _pool: PublicKey
): Promise<bigint> {
  // Reading the voter's stake entry requires the staking program's account
  // layout and a deployed program to read it from; neither is available in
  // this package. Returning 0n would silently disenfranchise every staker,
  // so this throws instead (same honest-failure pattern as
  // ../voting/power.ts getVotingPower).
  throw new Error(
    'getStakedVotingPower is not implemented: reading a stake entry requires ' +
    'the staking program (on-chain indexing), which is not deployed.'
  )
}

/**
 * Check if a voter has tokens staked in a specific pool
 */
export async function isStaked(
  connection: Connection,
  voter: PublicKey,
  pool: PublicKey
): Promise<boolean> {
  const power = await getStakedVotingPower(connection, voter, pool)
  return power > 0n
}

/**
 * Get the age of a stake entry in seconds.
 * Used for time-weighted voting calculations.
 */
export async function getStakeEntryAge(
  _connection: Connection,
  _voter: PublicKey,
  _pool: PublicKey
): Promise<bigint> {
  // The stake-entry timestamp lives in the (undeployed) staking program's
  // accounts. Returning 0n would silently zero every time-weighted vote —
  // throw instead.
  throw new Error(
    'getStakeEntryAge is not implemented: reading a stake entry timestamp ' +
    'requires the staking program (on-chain indexing), which is not deployed.'
  )
}
