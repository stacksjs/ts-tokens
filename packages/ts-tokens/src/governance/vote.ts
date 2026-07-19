/**
 * Voting
 */

import type { Connection, PublicKey, Keypair } from '@solana/web3.js'
import type {
  VoteRecord,
  VoteOptions,
  Proposal,
  Delegation,
  VotingPowerSnapshot,
} from './types'

/**
 * Cast a vote on a proposal.
 *
 * Not implemented — recording a vote (and computing the proposal-start snapshot
 * power) requires the undeployed governance program. Returning a fabricated
 * signature would let callers believe their vote was recorded on-chain.
 */
export async function castVote(
  _connection: Connection,
  _voter: Keypair,
  _options: VoteOptions
): Promise<{ voteRecord: VoteRecord; signature: string }> {
  throw new Error(
    'castVote is not implemented: the governance program is not deployed, so a ' +
    'vote cannot be recorded on-chain.'
  )
}

/**
 * Get voting power for an address on a proposal.
 *
 * Not implemented — a per-proposal snapshot needs the governance token mint and
 * snapshot slot from the proposal/DAO, which live in the undeployed program.
 * Use getVotingPowerSnapshot for a live (non-historical) token-balance read.
 */
export async function getVotingPower(
  _connection: Connection,
  _voter: PublicKey,
  _proposal: PublicKey
): Promise<bigint> {
  throw new Error(
    'getVotingPower is not implemented: a proposal-scoped snapshot requires the ' +
    'undeployed governance program. Use getVotingPowerSnapshot for live balance.'
  )
}

/**
 * Get a voter's LIVE governance-token balance as a voting-power snapshot.
 *
 * Note: this reads the CURRENT balance — it does NOT resolve the balance at
 * `snapshotTime` (that needs an archive node / on-chain snapshot the program
 * would enforce), and delegated power is not included. Both are surfaced so
 * callers can see what is and isn't accounted for.
 */
export async function getVotingPowerSnapshot(
  connection: Connection,
  voter: PublicKey,
  governanceToken: PublicKey,
  snapshotTime: bigint
): Promise<VotingPowerSnapshot & { isLive: boolean }> {
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(voter, {
    mint: governanceToken,
  })

  let ownPower = 0n
  for (const account of tokenAccounts.value) {
    ownPower += BigInt(account.account.data.parsed.info.tokenAmount.amount)
  }

  // Delegated power is not resolvable without the governance program.
  const delegatedPower = 0n

  return {
    voter,
    votingPower: ownPower,
    delegatedPower,
    totalPower: ownPower + delegatedPower,
    snapshotTime,
    isLive: true,
  }
}

/**
 * Delegate voting power. Not implemented — governance program undeployed.
 * Inputs are validated first so misuse is reported clearly.
 *
 * If `amount` is not specified, the full voting power is delegated.
 */
export async function delegateVotingPower(
  _connection: Connection,
  delegator: Keypair,
  delegate: PublicKey,
  amount?: bigint
): Promise<{ delegation: Delegation; signature: string }> {
  if (delegate.equals(delegator.publicKey)) {
    throw new Error('Cannot delegate voting power to yourself')
  }
  if (amount !== undefined && amount < 0n) {
    throw new Error('Delegation amount cannot be negative')
  }
  throw new Error(
    'delegateVotingPower is not implemented: the governance program is not deployed.'
  )
}

/**
 * Revoke delegation. Not implemented — governance program undeployed.
 */
export async function revokeDelegation(
  _connection: Connection,
  _delegator: Keypair,
  _delegate: PublicKey
): Promise<{ signature: string }> {
  throw new Error(
    'revokeDelegation is not implemented: the governance program is not deployed.'
  )
}

/**
 * Get delegations for an address. Not implemented — governance program
 * undeployed (returning empty arrays would hide real delegations).
 */
export async function getDelegations(
  _connection: Connection,
  _address: PublicKey
): Promise<{ delegatedTo: Delegation[]; delegatedFrom: Delegation[] }> {
  throw new Error(
    'getDelegations is not implemented: the governance program is not deployed.'
  )
}

/**
 * Get vote record for a voter on a proposal. Not implemented — governance
 * program undeployed. Returning null made double-vote prevention silently pass.
 */
export async function getVoteRecord(
  _connection: Connection,
  _proposal: PublicKey,
  _voter: PublicKey
): Promise<VoteRecord | null> {
  throw new Error(
    'getVoteRecord is not implemented: the governance program is not deployed.'
  )
}

/**
 * Get all votes for a proposal. Not implemented — governance program undeployed.
 */
export async function getProposalVotes(
  _connection: Connection,
  _proposal: PublicKey
): Promise<VoteRecord[]> {
  throw new Error(
    'getProposalVotes is not implemented: the governance program is not deployed.'
  )
}

/**
 * Check if address has voted
 */
export async function hasVoted(
  connection: Connection,
  proposal: PublicKey,
  voter: PublicKey
): Promise<boolean> {
  const record = await getVoteRecord(connection, proposal, voter)
  return record !== null
}

/**
 * Calculate vote breakdown
 */
export function calculateVoteBreakdown(proposal: Proposal): {
  forPercentage: number
  againstPercentage: number
  abstainPercentage: number
  totalVotes: bigint
} {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes

  if (totalVotes === 0n) {
    return {
      forPercentage: 0,
      againstPercentage: 0,
      abstainPercentage: 0,
      totalVotes: 0n,
    }
  }

  return {
    forPercentage: Number((proposal.forVotes * 10000n) / totalVotes) / 100,
    againstPercentage: Number((proposal.againstVotes * 10000n) / totalVotes) / 100,
    abstainPercentage: Number((proposal.abstainVotes * 10000n) / totalVotes) / 100,
    totalVotes,
  }
}

/**
 * Check if voting is still open
 */
export function isVotingOpen(proposal: Proposal): boolean {
  const currentTime = BigInt(Math.floor(Date.now() / 1000))
  return (
    proposal.status === 'active' &&
    currentTime >= proposal.startTime &&
    currentTime <= proposal.endTime
  )
}

/**
 * Get time remaining for voting
 */
export function getVotingTimeRemaining(proposal: Proposal): {
  seconds: bigint
  formatted: string
} {
  const currentTime = BigInt(Math.floor(Date.now() / 1000))

  if (currentTime >= proposal.endTime) {
    return { seconds: 0n, formatted: 'Ended' }
  }

  const remaining = proposal.endTime - currentTime

  // Format
  const days = remaining / 86400n
  const hours = (remaining % 86400n) / 3600n
  const minutes = (remaining % 3600n) / 60n

  let formatted = ''
  if (days > 0n) formatted += `${days}d `
  if (hours > 0n) formatted += `${hours}h `
  if (minutes > 0n) formatted += `${minutes}m`

  return {
    seconds: remaining,
    formatted: formatted.trim() || 'Less than 1 minute',
  }
}
