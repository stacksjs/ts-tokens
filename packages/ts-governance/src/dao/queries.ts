/**
 * DAO Queries
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import type { DAO } from '../types'

/**
 * Get DAO info.
 *
 * The DAO account layout belongs to the governance program, which is not
 * deployed, so there is no account data to deserialize. Returning null would be
 * indistinguishable from "the DAO does not exist" and let callers silently treat
 * an undeployable program as an empty result, so this throws instead.
 */
export async function getDAO(
  _connection: Connection,
  _address: PublicKey
): Promise<DAO | null> {
  throw new Error(
    'getDAO is not implemented: the governance program that owns DAO accounts ' +
    'is not deployed, so DAO state cannot be read from the chain.'
  )
}

/**
 * Get total voting power for a DAO
 */
export async function getTotalVotingPower(
  connection: Connection,
  governanceToken: PublicKey
): Promise<bigint> {
  const supply = await connection.getTokenSupply(governanceToken)
  return BigInt(supply.value.amount)
}

/**
 * Get the SOL and SPL token balances held by a treasury address.
 *
 * This is a read-only SPL/RPC query and does not depend on the governance
 * program, so it is fully implemented.
 */
export async function getTreasuryBalance(
  connection: Connection,
  treasury: PublicKey
): Promise<{ sol: number; tokens: Array<{ mint: string; amount: bigint }> }> {
  const solBalance = await connection.getBalance(treasury)

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(treasury, {
    programId: TOKEN_PROGRAM_ID,
  })

  const tokens = tokenAccounts.value.map(account => ({
    mint: account.account.data.parsed.info.mint as string,
    amount: BigInt(account.account.data.parsed.info.tokenAmount.amount),
  }))

  return {
    sol: solBalance / 1e9,
    tokens,
  }
}
