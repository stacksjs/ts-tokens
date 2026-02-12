/**
 * Vote Types
 */

import type { PublicKey } from '@solana/web3.js'

export type VoteType = 'for' | 'against' | 'abstain'

export interface VoteRecord {
  proposal: PublicKey
  voter: PublicKey
  voteType: VoteType
  votingPower: bigint
  timestamp: bigint
}

export interface VoteOptions {
  proposal: PublicKey
  voteType: VoteType
}

export interface ChangeVoteOptions {
  proposal: PublicKey
  newVoteType: VoteType
}

export interface WithdrawVoteOptions {
  proposal: PublicKey
}

export interface VotingPowerSnapshot {
  voter: PublicKey
  votingPower: bigint
  delegatedPower: bigint
  totalPower: bigint
  snapshotTime: bigint
}
