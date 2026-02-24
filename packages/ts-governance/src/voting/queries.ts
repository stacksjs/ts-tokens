/**
 * Voting Queries
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { VoteRecord, Proposal } from '../types'

/**
 * Get vote record for a _voter on a _proposal
 */
export async function getVoteRecord(
  _connection: Connection,
  _proposal: PublicKey,
  _voter: PublicKey
): Promise<VoteRecord | null> {
  // In production, would query vote record PDA account
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
