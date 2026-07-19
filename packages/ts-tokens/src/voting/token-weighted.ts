/**
 * Token-Weighted Voting
 *
 * 1 token = 1 vote
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
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
      // SPL token account: amount is the u64 LE at offset 64.
      ownPower += account.data.readBigUInt64LE(64)
    }
  }

  return {
    own: ownPower,
    delegated: 0n, // Would fetch delegations
    total: ownPower,
    mechanism: 'token_weighted',
  }
}

// SPL Token program id (owns standard token accounts).
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

/**
 * Create voting snapshot
 *
 * Enumerates *every* token account for the mint (not just the largest 20) and
 * aggregates balances by owner wallet, so the resulting map is keyed by wallet
 * address — matching how calculateTokenWeightedPower looks holders up.
 */
export async function createSnapshot(
  connection: Connection,
  proposal: PublicKey,
  token: PublicKey
): Promise<VotingSnapshot> {
  const slot = await connection.getSlot()

  // Enumerate all SPL token accounts for this mint. A standard token account is
  // exactly 165 bytes and stores the mint at offset 0.
  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      { dataSize: 165 },
      { memcmp: { offset: 0, bytes: token.toBase58() } },
    ],
  })

  // Aggregate balances by owner wallet. Token account layout:
  //   offset 0:  mint      (32 bytes)
  //   offset 32: owner     (32 bytes)
  //   offset 64: amount    (u64 little-endian)
  const holders = new Map<string, bigint>()

  for (const { account } of accounts) {
    const data = account.data
    const owner = new PublicKey(data.subarray(32, 64)).toBase58()
    const amount = data.readBigUInt64LE(64)
    holders.set(owner, (holders.get(owner) ?? 0n) + amount)
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
  _connection: Connection,
  _voter: PublicKey,
  _proposal: PublicKey,
  _snapshot: VotingSnapshot
): Promise<{ hasVoted: boolean; transferred: boolean }> {
  // Double-voting detection requires on-chain state that is not available
  // client-side without a deployed governance program:
  //   1. The voter's vote-record PDA (to see if they already voted).
  //   2. The voter's balance at the snapshot slot vs. now (to detect tokens
  //      transferred after the snapshot).
  // Returning "not voted" would silently disable double-vote protection, so
  // this throws instead of fabricating safety.
  throw new Error(
    'checkDoubleVoting is not implemented: vote-record PDAs and snapshot-slot ' +
    'balance reconstruction require a deployed governance program / archive indexing.'
  )
}

/**
 * Get voting power at specific _slot
 */
export async function getHistoricalVotingPower(
  _connection: Connection,
  _voter: PublicKey,
  _token: PublicKey,
  _slot: number
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
