/**
 * Treasury Creation
 */

import type { Connection, Keypair } from '@solana/web3.js'
import type { Treasury, CreateTreasuryOptions } from '../types'

/**
 * Create a treasury for a DAO.
 *
 * Depends on the governance program (undeployed) to create and own the treasury
 * account, so this throws rather than returning a fabricated signature for a
 * treasury that was never created on-chain.
 */
export async function createTreasury(
  _connection: Connection,
  _authority: Keypair,
  _options: CreateTreasuryOptions
): Promise<{ treasury: Treasury; signature: string }> {
  throw new Error(
    'createTreasury is not implemented: the governance program that owns ' +
    'treasury accounts is not deployed. No treasury was created on-chain.'
  )
}
