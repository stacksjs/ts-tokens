/**
 * Treasury Creation
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import type {
  Treasury,
  CreateTreasuryOptions,
  TreasuryBalance,
  TreasuryStats,
} from './types'

/**
 * Create a new treasury for a DAO.
 *
 * NOT IMPLEMENTED. A treasury is an account owned and governed by the DAO's
 * governance program so that only approved proposals can move its funds. That
 * program is not deployed, so there is nothing to create the account against or
 * to register the DAO as its authority. The previous implementation returned a
 * freshly generated keypair's public key and discarded the secret key — any
 * tokens later deposited to that address's associated token account (see
 * `deposit` in ./operations) would be permanently unrecoverable. Fail loudly
 * instead of handing back an unusable address.
 */
export async function createTreasury(
  _connection: Connection,
  _payer: PublicKey,
  _options: CreateTreasuryOptions
): Promise<{ address: PublicKey; signature: string }> {
  throw new Error(
    'createTreasury is not implemented: the governance program that owns and ' +
    'authorizes treasury accounts is not deployed. Returning a throwaway address ' +
    'would permanently lock any deposited funds.'
  )
}

/**
 * Get treasury info
 */
export async function getTreasury(
  _connection: Connection,
  _address: PublicKey
): Promise<Treasury | null> {
  // In production, would fetch and parse treasury account
  return null
}

/**
 * Get treasury balances.
 *
 * Reads every SPL token account (classic Token and Token-2022) owned by the
 * treasury address and returns their balances. This is a read-only RPC query
 * that does not depend on the governance program.
 */
export async function getTreasuryBalances(
  connection: Connection,
  treasury: PublicKey
): Promise<TreasuryBalance[]> {
  const balances: TreasuryBalance[] = []

  for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
    const { value } = await connection.getParsedTokenAccountsByOwner(treasury, {
      programId,
    })

    for (const { pubkey, account } of value) {
      const info = (account.data as { parsed?: { info?: any } }).parsed?.info
      const tokenAmount = info?.tokenAmount
      if (!info?.mint || !tokenAmount) continue

      balances.push({
        mint: new PublicKey(info.mint),
        amount: BigInt(tokenAmount.amount),
        decimals: tokenAmount.decimals,
        tokenAccount: pubkey,
      })
    }
  }

  return balances
}

/**
 * Get treasury balance for specific token
 */
export async function getTreasuryBalance(
  connection: Connection,
  treasury: PublicKey,
  mint: PublicKey
): Promise<TreasuryBalance | null> {
  const balances = await getTreasuryBalances(connection, treasury)
  return balances.find(b => b.mint.equals(mint)) ?? null
}

/**
 * Get treasury stats.
 *
 * Deposit/withdrawal totals and depositor counts require parsing the treasury's
 * full transaction history, which is not implemented (see `getTransactionHistory`
 * in ./operations). `tokenCount` is derived from the live balances. The
 * history-derived aggregates are reported as `null` rather than a fabricated `0n`
 * so callers can tell the difference between "no activity" and "not computed".
 */
export async function getTreasuryStats(
  connection: Connection,
  treasury: PublicKey
): Promise<TreasuryStats & { historyAvailable: boolean }> {
  const balances = await getTreasuryBalances(connection, treasury)

  return {
    totalDeposits: null,
    totalWithdrawals: null,
    transactionCount: null,
    uniqueDepositors: null,
    tokenCount: balances.length,
    historyAvailable: false,
  }
}

/**
 * Check if address is a treasury
 */
export async function isTreasury(
  connection: Connection,
  address: PublicKey
): Promise<boolean> {
  const treasury = await getTreasury(connection, address)
  return treasury !== null
}

/**
 * Get treasury by DAO
 */
export async function getTreasuryByDAO(
  _connection: Connection,
  _dao: PublicKey
): Promise<Treasury | null> {
  // In production, would derive treasury PDA from DAO
  return null
}

/**
 * Derive treasury address from DAO
 */
export function deriveTreasuryAddress(
  dao: PublicKey,
  programId: PublicKey
): PublicKey {
  const [treasury] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), dao.toBuffer()],
    programId
  )
  return treasury
}

/**
 * Format treasury for display
 */
export function formatTreasury(treasury: Treasury): string {
  const lines = [
    `Treasury: ${treasury.address.toBase58()}`,
    `DAO: ${treasury.dao.toBase58()}`,
    `Authority: ${treasury.authority.toBase58()}`,
    '',
    'Balances:',
  ]

  for (const balance of treasury.balances) {
    const amount = Number(balance.amount) / Math.pow(10, balance.decimals)
    lines.push(`  ${balance.mint.toBase58().slice(0, 8)}...: ${amount.toLocaleString()}`)
  }

  if (treasury.totalValueUsd !== undefined) {
    lines.push('', `Total Value: $${treasury.totalValueUsd.toLocaleString()}`)
  }

  return lines.join('\n')
}
