/**
 * Voting Power
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { VotingPowerSnapshot, VoteWeightType } from '../types'
import { calculateTimeWeightedPower } from './time-weighted'
import type { TimeWeightConfig } from './time-weighted'

/**
 * Get effective voting power for a voter on a specific proposal.
 *
 * The effective power is the voter's token balance snapshotted at the
 * proposal's start slot, plus power delegated to them, minus power they
 * delegated away. All three depend on the governance program's proposal and
 * delegation account state, which is not deployed — the balance snapshot in
 * particular cannot be reconstructed without the program recording it. Returning
 * 0n would silently disenfranchise every voter, so this throws instead.
 *
 * To read a voter's live token balance (for a token-weighted DAO), use
 * `getVotingPowerSnapshot` with the DAO's governance token.
 */
export async function getVotingPower(
  _connection: Connection,
  _voter: PublicKey,
  _proposal: PublicKey
): Promise<bigint> {
  throw new Error(
    'getVotingPower is not implemented: the governance program that records the ' +
    'per-proposal voting-power snapshot and delegation state is not deployed.'
  )
}

/**
 * Get a voter's live token-based voting power.
 *
 * Reads the voter's current governance-token balance via RPC. This is a genuine
 * read of `votingPower` (own power). Two honest limitations:
 * - `snapshotTime` cannot be honored as a *historical* snapshot: without the
 *   governance program recording balances per proposal, only the live balance
 *   is available. The value is echoed back so callers can label the reading.
 * - `delegatedPower` is not sourced here — delegated power lives in the
 *   (undeployed) governance program and must be summed separately (see
 *   `getTotalDelegatedPower`). It is reported as 0n to avoid inventing a number.
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
