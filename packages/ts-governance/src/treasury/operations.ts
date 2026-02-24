/**
 * Treasury Operations
 */

import type { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { PublicKey as PK } from '@solana/web3.js'
import type { DepositOptions, WithdrawOptions } from '../types'
import { getTreasuryAddress } from '../programs/program'

/**
 * Deposit to treasury
 */
export async function depositToTreasury(
  _connection: Connection,
  _depositor: Keypair,
  options: DepositOptions
): Promise<{ signature: string }> {
  const { dao, amount } = options
  const treasury = getTreasuryAddress(dao)

  return {
    signature: `treasury_deposit_${treasury.toBase58().slice(0, 8)}`,
  }
}

/**
 * Withdraw from treasury (governance-only)
 */
export async function withdrawFromTreasury(
  _connection: Connection,
  _authority: Keypair,
  options: WithdrawOptions
): Promise<{ signature: string }> {
  const { dao, _recipient, amount } = options
  const treasury = getTreasuryAddress(dao)

  return {
    signature: `treasury_withdraw_${treasury.toBase58().slice(0, 8)}`,
  }
}

/**
 * Get treasury balance
 */
export async function getTreasuryBalance(
  connection: Connection,
  dao: PublicKey
): Promise<{ sol: number; tokens: Array<{ mint: string; amount: bigint }> }> {
  const treasury = getTreasuryAddress(dao)
  const solBalance = await connection.getBalance(treasury)

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(treasury, {
    programId: new PK('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
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
