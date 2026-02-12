/**
 * DAO Queries
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { DAO } from '../types'

/**
 * Get DAO info
 */
export async function getDAO(
  connection: Connection,
  address: PublicKey
): Promise<DAO | null> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    return null
  }

  // In production, would deserialize from account data
  return null
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
 * Get DAO treasury balance
 */
export async function getTreasuryBalance(
  connection: Connection,
  treasury: PublicKey
): Promise<{ sol: number; tokens: Array<{ mint: string; amount: bigint }> }> {
  const solBalance = await connection.getBalance(treasury)

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(treasury, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
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
