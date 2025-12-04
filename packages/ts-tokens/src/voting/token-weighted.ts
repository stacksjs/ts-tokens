/**
 * Token-Weighted Voting
 *
 * 1 token = 1 vote
 */

import { Connection, PublicKey } from '@solana/web3.js'
import type {
  VotingPower,
  TokenWeightedConfig,
  VotingSnapshot,
} from './types'

/**
 * Calculate token-weighted voting power
 */
export async function calculateTokenWeightedPower(
  connection: Connection,
  voter: PublicKey,
  config: TokenWeightedConfig,
  snapshot?: VotingSnapshot
): Promise<VotingPower> {
  let ownPower = 0n

  if (snapshot) {
    // Use snapshot balance
    ownPower = snapshot.holders.get(voter.toBase58()) ?? 0n
  } else {
    // Get current balance
    const tokenAccounts = await connection.getTokenAccountsByOwner(voter, {
      mint: config.token,
    })

    for (const { account } of tokenAccounts.value) {
      const data = account.data
      // Parse token account data to get balance
      // Simplified - in production would properly decode
      ownPower += 0n
    }
  }

  return {
    own: ownPower,
    delegated: 0n, // Would fetch delegations
    total: ownPower,
    mechanism: 'token_weighted',
  }
}

/**
 * Create voting snapshot
 */
export async function createSnapshot(
  connection: Connection,
  proposal: PublicKey,
  token: PublicKey
): Promise<VotingSnapshot> {
  const slot = await connection.getSlot()

  // Get all token holders
  const accounts = await connection.getTokenLargestAccounts(token)
  const holders = new Map<string, bigint>()

  for (const account of accounts.value) {
    holders.set(account.address.toBase58(), BigInt(account.amount))
  }

  // Get total supply
  const supplyInfo = await connection.getTokenSupply(token)
  const totalSupply = BigInt(supplyInfo.value.amount)

  return {
    proposal,
    slot,
    timestamp: Date.now(),
    totalSupply,
    holders,
  }
}

/**
 * Check for double voting via token transfer
 */
export async function checkDoubleVoting(
  connection: Connection,
  voter: PublicKey,
  proposal: PublicKey,
  snapshot: VotingSnapshot
): Promise<{ hasVoted: boolean; transferred: boolean }> {
  // In production, would:
  // 1. Check if voter has already voted
  // 2. Check if tokens were transferred after snapshot

  return {
    hasVoted: false,
    transferred: false,
  }
}

/**
 * Get voting power at specific slot
 */
export async function getHistoricalVotingPower(
  connection: Connection,
  voter: PublicKey,
  token: PublicKey,
  slot: number
): Promise<bigint> {
  // In production, would query historical balance
  // This requires archive node access
  return 0n
}

/**
 * Validate token-weighted vote
 */
export function validateTokenWeightedVote(
  votingPower: VotingPower,
  minPower: bigint = 0n
): { valid: boolean; reason?: string } {
  if (votingPower.total === 0n) {
    return { valid: false, reason: 'No voting power' }
  }

  if (votingPower.total < minPower) {
    return { valid: false, reason: `Minimum ${minPower} voting power required` }
  }

  return { valid: true }
}

/**
 * Format voting power for display
 */
export function formatTokenWeightedPower(power: VotingPower, decimals: number = 9): string {
  const own = Number(power.own) / Math.pow(10, decimals)
  const delegated = Number(power.delegated) / Math.pow(10, decimals)
  const total = Number(power.total) / Math.pow(10, decimals)

  return [
    `Own: ${own.toLocaleString()}`,
    `Delegated: ${delegated.toLocaleString()}`,
    `Total: ${total.toLocaleString()}`,
  ].join('\n')
}
