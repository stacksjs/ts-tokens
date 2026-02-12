/**
 * Votes SDK Facade Types
 *
 * High-level API types for the `createVotes()` factory.
 */

import type { Connection, Keypair, PublicKey } from '@solana/web3.js'
import type {
  DAO,
  DAOConfig,
  Proposal,
  ProposalAction,
  ProposalStatus,
  VoteType,
  VoteRecord,
  Delegation,
  VoteWeightType,
} from './types'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface VotesConfig {
  connection: Connection
  wallet: Keypair
}

// ---------------------------------------------------------------------------
// DAO inputs / outputs
// ---------------------------------------------------------------------------

export interface CreateDAOInput {
  name: string
  token: PublicKey
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

// ---------------------------------------------------------------------------
// Proposal inputs / outputs
// ---------------------------------------------------------------------------

export interface CreateProposalInput {
  dao: PublicKey | DAO
  title: string
  description: string
  actions: ProposalAction[]
}

export interface ProposalStatusResult {
  status: ProposalStatus
  votesFor: bigint
  votesAgainst: bigint
  votesAbstain: bigint
  quorumReached: boolean
  passingThreshold: boolean
  timeRemaining: {
    seconds: bigint
    formatted: string
  }
}

// ---------------------------------------------------------------------------
// Treasury / action inputs
// ---------------------------------------------------------------------------

export interface TransferFromTreasuryInput {
  to: PublicKey
  amount: bigint | number
  token?: PublicKey
}

// ---------------------------------------------------------------------------
// Delegation inputs
// ---------------------------------------------------------------------------

export interface DelegateInput {
  to: PublicKey
  amount: bigint | 'all'
  expires?: string | bigint
}

// ---------------------------------------------------------------------------
// Voting power result
// ---------------------------------------------------------------------------

export interface VotingPowerResult {
  own: bigint
  delegated: bigint
  total: bigint
}

// ---------------------------------------------------------------------------
// Votes facade interface
// ---------------------------------------------------------------------------

export interface Votes {
  dao: {
    create(input: CreateDAOInput): Promise<{ dao: DAO; signature: string }>
    info(dao: PublicKey | DAO): Promise<DAO | null>
  }

  proposal: {
    create(input: CreateProposalInput): Promise<{ proposal: Proposal; signature: string }>
    status(proposal: PublicKey | Proposal): Promise<ProposalStatusResult>
    cancel(proposal: PublicKey): Promise<{ signature: string }>
    execute(proposal: PublicKey): Promise<{ signature: string }>
    list(dao: PublicKey, status?: ProposalStatus): Promise<Proposal[]>
  }

  actions: {
    transferFromTreasury(input: TransferFromTreasuryInput): ProposalAction
    updateConfig(newConfig: Partial<DAOConfig>): ProposalAction
    mintTokens(mint: PublicKey, recipient: PublicKey, amount: bigint): ProposalAction
    burnTokens(mint: PublicKey, amount: bigint): ProposalAction
  }

  vote(proposal: PublicKey, voteType: VoteType): Promise<{ voteRecord: VoteRecord; signature: string }>
  delegate(dao: PublicKey, input: DelegateInput): Promise<{ delegation: Delegation; signature: string }>
  undelegate(dao: PublicKey): Promise<{ signature: string }>
  votingPower(dao: PublicKey | DAO, voter?: PublicKey): Promise<VotingPowerResult>
}
