/**
 * DAO Types
 */

import type { PublicKey } from '@solana/web3.js'

export type VoteWeightType = 'token' | 'quadratic' | 'nft' | 'time-weighted'

export interface DAOConfig {
  votingPeriod: bigint
  quorum: number
  approvalThreshold: number
  executionDelay: bigint
  minProposalThreshold: bigint
  vetoAuthority?: PublicKey
  voteWeightType: VoteWeightType
  allowEarlyExecution: boolean
  allowVoteChange: boolean
}

export interface DAO {
  address: PublicKey
  name: string
  authority: PublicKey
  governanceToken: PublicKey
  treasury: PublicKey
  config: DAOConfig
  proposalCount: bigint
  totalVotingPower: bigint
  createdAt: bigint
}

export interface CreateDAOOptions {
  name: string
  governanceToken: PublicKey
  config: {
    votingPeriod: string | bigint
    quorum: number
    approvalThreshold: number
    executionDelay?: string | bigint
    minProposalThreshold?: bigint
    vetoAuthority?: PublicKey
    voteWeightType?: VoteWeightType
    allowEarlyExecution?: boolean
    allowVoteChange?: boolean
  }
}

export interface UpdateDAOConfigOptions {
  dao: PublicKey
  config: Partial<DAOConfig>
}
