/**
 * Treasury Creation
 */

import type { Connection } from '@solana/web3.js'
import type {
  CreateTreasuryOptions,
  Treasury,
  TreasuryBalance,
  TreasuryStats,
} from './types'
import { Keypair, PublicKey } from '@solana/web3.js'

/**
 * Create a new treasury for a DAO
 */
export async function createTreasury(
  connection: Connection,
  payer: PublicKey,
  options: CreateTreasuryOptions,
): Promise<{ address: PublicKey, signature: string }> {
  const treasuryKeypair = Keypair.generate()

  // In production, would:
  // 1. Create treasury account
  // 2. Set DAO as authority
  // 3. Optionally make initial deposit

  return {
    address: treasuryKeypair.publicKey,
    signature: `treasury_created_${Date.now()}`,
  }
}

/**
 * Get treasury info
 */
export async function getTreasury(
  connection: Connection,
  address: PublicKey,
): Promise<Treasury | null> {
  // In production, would fetch and parse treasury account
  return null
}

/**
 * Get treasury balances
 */
export async function getTreasuryBalances(
  connection: Connection,
  treasury: PublicKey,
): Promise<TreasuryBalance[]> {
  // In production, would fetch all token accounts owned by treasury
  return []
}

/**
 * Get treasury balance for specific token
 */
export async function getTreasuryBalance(
  connection: Connection,
  treasury: PublicKey,
  mint: PublicKey,
): Promise<TreasuryBalance | null> {
  const balances = await getTreasuryBalances(connection, treasury)
  return balances.find(b => b.mint.equals(mint)) ?? null
}

/**
 * Get treasury stats
 */
export async function getTreasuryStats(
  connection: Connection,
  treasury: PublicKey,
): Promise<TreasuryStats> {
  // In production, would calculate from transaction history
  return {
    totalDeposits: 0n,
    totalWithdrawals: 0n,
    transactionCount: 0,
    uniqueDepositors: 0,
    tokenCount: 0,
  }
}

/**
 * Check if address is a treasury
 */
export async function isTreasury(
  connection: Connection,
  address: PublicKey,
): Promise<boolean> {
  const treasury = await getTreasury(connection, address)
  return treasury !== null
}

/**
 * Get treasury by DAO
 */
export async function getTreasuryByDAO(
  connection: Connection,
  dao: PublicKey,
): Promise<Treasury | null> {
  // In production, would derive treasury PDA from DAO
  return null
}

/**
 * Derive treasury address from DAO
 */
export function deriveTreasuryAddress(
  dao: PublicKey,
  programId: PublicKey,
): PublicKey {
  const [treasury] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), dao.toBuffer()],
    programId,
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
    const amount = Number(balance.amount) / 10 ** balance.decimals
    lines.push(`  ${balance.mint.toBase58().slice(0, 8)}...: ${amount.toLocaleString()}`)
  }

  if (treasury.totalValueUsd !== undefined) {
    lines.push('', `Total Value: $${treasury.totalValueUsd.toLocaleString()}`)
  }

  return lines.join('\n')
}
