/**
 * Treasury Operations
 */

import type { Connection, Keypair, PublicKey } from '@solana/web3.js'
import type { DepositOptions, WithdrawOptions } from '../types'
import { getTreasuryAddress } from '../programs/program'
import { getTreasuryBalance as getTreasuryBalanceForAddress } from '../dao/queries'

/**
 * Deposit to treasury.
 *
 * A real deposit is an SPL token transfer into the treasury's associated token
 * account. That flow depends on the governance program (undeployed) to own the
 * treasury account and derive its token accounts, so this throws rather than
 * returning a fabricated signature for a transfer that never happened.
 */
export async function depositToTreasury(
  _connection: Connection,
  _depositor: Keypair,
  _options: DepositOptions
): Promise<{ signature: string }> {
  throw new Error(
    'depositToTreasury is not implemented: the governance program that owns ' +
    'the treasury account is not deployed. No funds were transferred.'
  )
}

/**
 * Withdraw from treasury (governance-only).
 *
 * A withdrawal must be authorised by the governance program, which is not
 * deployed, so the treasury cannot release funds. Throws rather than returning a
 * fabricated signature for a withdrawal that never happened.
 */
export async function withdrawFromTreasury(
  _connection: Connection,
  _authority: Keypair,
  _options: WithdrawOptions
): Promise<{ signature: string }> {
  throw new Error(
    'withdrawFromTreasury is not implemented: the governance program that ' +
    'authorises treasury withdrawals is not deployed. No funds were transferred.'
  )
}

/**
 * Get treasury balance for a DAO.
 *
 * Derives the treasury address and reads its balances via the shared read-only
 * implementation. This is a plain SPL/RPC query and does not depend on the
 * governance program.
 */
export async function getTreasuryBalance(
  connection: Connection,
  dao: PublicKey
): Promise<{ sol: number; tokens: Array<{ mint: string; amount: bigint }> }> {
  const treasury = getTreasuryAddress(dao)
  return getTreasuryBalanceForAddress(connection, treasury)
}
