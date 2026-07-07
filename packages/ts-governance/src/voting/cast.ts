/**
 * Vote Casting
 */

import type { Connection, Keypair } from '@solana/web3.js'
import type { VoteRecord, VoteOptions, ChangeVoteOptions, WithdrawVoteOptions } from '../types'
import { getVotingPower } from './power'

/**
 * Cast a vote on a proposal.
 *
 * Resolves the voter's voting power first (which requires the governance
 * program's per-proposal snapshot and therefore throws while the program is
 * undeployed), rejecting zero-power voters. Recording the vote itself likewise
 * depends on the undeployed program, so this throws rather than fabricating a
 * signature for a vote that was never recorded on-chain.
 */
export async function castVote(
  connection: Connection,
  voter: Keypair,
  options: VoteOptions
): Promise<{ voteRecord: VoteRecord; signature: string }> {
  const { proposal } = options

  const votingPower = await getVotingPower(connection, voter.publicKey, proposal)

  if (votingPower === 0n) {
    throw new Error('No voting power')
  }

  throw new Error(
    'castVote is not implemented: the governance program that records votes is ' +
    'not deployed. No vote was recorded on-chain.'
  )
}

/**
 * Change an existing vote.
 *
 * Applies the same guards as `castVote` — it resolves and rejects zero voting
 * power (via getVotingPower, which throws while the program is undeployed) — and
 * then throws, because changing a vote requires an existing vote record and the
 * proposal's voting window, both of which live in the undeployed governance
 * program. It never fabricates a signature for a change that never happened.
 */
export async function changeVote(
  connection: Connection,
  voter: Keypair,
  options: ChangeVoteOptions
): Promise<{ voteRecord: VoteRecord; signature: string }> {
  const { proposal } = options

  const votingPower = await getVotingPower(connection, voter.publicKey, proposal)

  if (votingPower === 0n) {
    throw new Error('No voting power')
  }

  throw new Error(
    'changeVote is not implemented: the governance program that stores vote ' +
    'records and proposal voting windows is not deployed. No vote was changed ' +
    'on-chain.'
  )
}

/**
 * Withdraw a vote from a proposal.
 *
 * Depends on the governance program (undeployed) to remove the vote record, so
 * this throws rather than returning a fabricated signature for a withdrawal that
 * never happened.
 */
export async function withdrawVote(
  _connection: Connection,
  _voter: Keypair,
  _options: WithdrawVoteOptions
): Promise<{ signature: string }> {
  throw new Error(
    'withdrawVote is not implemented: the governance program that stores vote ' +
    'records is not deployed. No vote was withdrawn on-chain.'
  )
}
