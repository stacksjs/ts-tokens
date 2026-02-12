/**
 * Staking Integration
 *
 * Derive voting power from staked tokens.
 */

import type { Connection, PublicKey } from '@solana/web3.js'

/**
 * Get voting power from staked tokens
 */
export async function getStakedVotingPower(
  connection: Connection,
  voter: PublicKey,
  pool: PublicKey
): Promise<bigint> {
  // In production, would read stake entry from ts-tokens/staking
  // and return the staked amount as voting power
  return 0n
}
