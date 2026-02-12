/**
 * Voting Power
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { VotingPowerSnapshot, VoteWeightType } from '../types'
import { calculateTimeWeightedPower } from './time-weighted'
import type { TimeWeightConfig } from './time-weighted'

/**
 * Get voting power for an address
 */
export async function getVotingPower(
  connection: Connection,
  voter: PublicKey,
  proposal: PublicKey
): Promise<bigint> {
  // In production:
  // 1. Get token balance at proposal start time (snapshot)
  // 2. Add delegated voting power
  // 3. Subtract any power delegated to others
  return 0n
}

/**
 * Get voting power snapshot
 */
export async function getVotingPowerSnapshot(
  connection: Connection,
  voter: PublicKey,
  governanceToken: PublicKey,
  snapshotTime: bigint
): Promise<VotingPowerSnapshot> {
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(voter, {
    mint: governanceToken,
  })

  let ownPower = 0n
  for (const account of tokenAccounts.value) {
    ownPower += BigInt(account.account.data.parsed.info.tokenAmount.amount)
  }

  const delegatedPower = 0n

  return {
    voter,
    votingPower: ownPower,
    delegatedPower,
    totalPower: ownPower + delegatedPower,
    snapshotTime,
  }
}

/**
 * Calculate quadratic voting power
 */
export function calculateQuadraticPower(tokenBalance: bigint): bigint {
  if (tokenBalance <= 0n) return 0n
  // Integer square root via Newton's method
  let x = tokenBalance
  let y = (x + 1n) / 2n
  while (y < x) {
    x = y
    y = (x + tokenBalance / x) / 2n
  }
  return x
}

/**
 * Calculate NFT-based voting power (1 NFT = 1 vote)
 */
export function calculateNFTVotingPower(nftCount: number): bigint {
  return BigInt(nftCount)
}

/**
 * Calculate weighted voting power based on the DAO's vote weight type.
 *
 * Dispatches to the appropriate calculation:
 * - `'token'`         → identity (returns base balance)
 * - `'quadratic'`     → integer square-root
 * - `'nft'`           → 1 NFT = 1 vote
 * - `'time-weighted'` → base * time multiplier
 */
export function calculateWeightedPower(
  type: VoteWeightType,
  balance: bigint,
  options?: {
    nftCount?: number
    holdDurationSeconds?: bigint
    timeWeightConfig?: TimeWeightConfig
  },
): bigint {
  switch (type) {
    case 'token':
      return balance
    case 'quadratic':
      return calculateQuadraticPower(balance)
    case 'nft':
      return calculateNFTVotingPower(options?.nftCount ?? 0)
    case 'time-weighted':
      return calculateTimeWeightedPower(
        balance,
        options?.holdDurationSeconds ?? 0n,
        options?.timeWeightConfig,
      )
    default:
      return balance
  }
}
