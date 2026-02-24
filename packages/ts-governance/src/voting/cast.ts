/**
 * Vote Casting
 */

import type { Connection, Keypair, PublicKey } from '@solana/web3.js'
import type { VoteRecord, VoteOptions, ChangeVoteOptions, WithdrawVoteOptions } from '../types'
import { getVotingPower } from './power'

/**
 * Cast a vote on a proposal
 */
export async function castVote(
  connection: Connection,
  voter: Keypair,
  options: VoteOptions
): Promise<{ voteRecord: VoteRecord; signature: string }> {
  const { proposal, voteType } = options

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
 * Change an existing vote
 */
export async function changeVote(
  connection: Connection,
  voter: Keypair,
  options: ChangeVoteOptions
): Promise<{ voteRecord: VoteRecord; signature: string }> {
  const { proposal, newVoteType } = options

  const votingPower = await getVotingPower(connection, voter.publicKey, proposal)

  const voteRecord: VoteRecord = {
    proposal,
    voter: voter.publicKey,
    voteType: newVoteType,
    votingPower,
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
  }

  return {
    voteRecord,
    signature: `vote_changed_${proposal.toBase58().slice(0, 8)}`,
  }
}

/**
 * Withdraw a vote from a proposal
 */
export async function withdrawVote(
  _connection: Connection,
  _voter: Keypair,
  options: WithdrawVoteOptions
): Promise<{ signature: string }> {
  const { proposal } = options

  return {
    signature: `vote_withdrawn_${proposal.toBase58().slice(0, 8)}`,
  }
}
