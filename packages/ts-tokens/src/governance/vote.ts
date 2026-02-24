/**
 * Voting
 */

import type { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { getVoteRecordAddress } from 'ts-governance/programs'
import type {
  VoteRecord,
  VoteType,
  VoteOptions,
  Proposal,
  Delegation,
  VotingPowerSnapshot,
} from './types'

/**
 * Cast a vote on a proposal
 */
export async function castVote(
  connection: Connection,
  voter: Keypair,
  options: VoteOptions
): Promise<{ voteRecord: VoteRecord; signature: string }> {
  const { proposal, voteType } = options

  // Get voter's voting power
  const votingPower = await getVotingPower(connection, voter.publicKey, proposal)

  if (votingPower === 0n) {
    throw new Error('No voting power')
  }

  const voteRecord: VoteRecord = {
    proposal,
    voter: voter.publicKey,
    voteType,
    votingPower,
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
  }

  return {
    voteRecord,
    signature: `vote_cast_${proposal.toBase58().slice(0, 8)}`,
  }
}

/**
 * Get voting power for an address
 */
export async function getVotingPower(
  _connection: Connection,
  _voter: PublicKey,
  proposal: PublicKey
): Promise<bigint> {
  // In production, would:
  // 1. Get token balance at proposal start time (snapshot)
  // 2. Add delegated voting power
  // 3. Subtract any power delegated to others

  // Simplified: just get current token balance
  // Would need governance token mint from proposal/DAO
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
  // In production, would query historical balance
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(voter, {
    mint: governanceToken,
  })

  let ownPower = 0n
  for (const account of tokenAccounts.value) {
    ownPower += BigInt(account.account.data.parsed.info.tokenAmount.amount)
  }

  // Get delegated power (simplified)
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
 * Delegate voting power
 */
export async function delegateVotingPower(
  _connection: Connection,
  delegator: Keypair,
  delegate: PublicKey,
  amount?: bigint // If not specified, delegate all
): Promise<{ delegation: Delegation; signature: string }> {
  const delegation: Delegation = {
    delegator: delegator.publicKey,
    delegate,
    amount: amount ?? 0n, // 0 means all
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
  }

  return {
    delegation,
    signature: `delegated_${delegate.toBase58().slice(0, 8)}`,
  }
}

/**
 * Revoke delegation
 */
export async function revokeDelegation(
  _connection: Connection,
  _delegator: Keypair,
  delegate: PublicKey
): Promise<{ signature: string }> {
  return {
    signature: `delegation_revoked_${delegate.toBase58().slice(0, 8)}`,
  }
}

/**
 * Get delegations for an _address
 */
export async function getDelegations(
  _connection: Connection,
  _address: PublicKey
): Promise<{ delegatedTo: Delegation[]; delegatedFrom: Delegation[] }> {
  // In production, would query delegation accounts
  return {
    delegatedTo: [],
    delegatedFrom: [],
  }
}

/**
 * Get vote record for a _voter on a _proposal
 */
export async function getVoteRecord(
  _connection: Connection,
  _proposal: PublicKey,
  _voter: PublicKey
): Promise<VoteRecord | null> {
  // In production, would query vote record account
  return null
}

/**
 * Get all votes for a _proposal
 */
export async function getProposalVotes(
  _connection: Connection,
  _proposal: PublicKey
): Promise<VoteRecord[]> {
  // In production, would use getProgramAccounts
  return []
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
