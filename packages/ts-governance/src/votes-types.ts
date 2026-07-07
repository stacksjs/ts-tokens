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
  /**
   * The treasury source. For a SOL transfer this is the wallet debited (and
   * signer). For a token transfer this is the *source token account* (ATA).
   */
  from: PublicKey
  /**
   * The recipient. For a SOL transfer this is the destination wallet. For a
   * token transfer this is the *destination token account* (ATA).
   */
  to: PublicKey
  amount: bigint | number
  /**
   * When set, builds an SPL token transfer instead of a SOL transfer. Ignored
   * for the accounts (which are `from`/`to` token accounts); `owner` signs.
   */
  token?: PublicKey
  /** Owner authority that signs for the source token account (token transfers). */
  owner?: PublicKey
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
    status(proposal: PublicKey | Proposal, dao?: DAO): Promise<ProposalStatusResult>
    cancel(proposal: PublicKey): Promise<{ signature: string }>
    execute(proposal: PublicKey): Promise<{ signature: string }>
    list(dao: PublicKey, status?: ProposalStatus): Promise<Proposal[]>
  }

  actions: {
    transferFromTreasury(input: TransferFromTreasuryInput): ProposalAction
    updateConfig(newConfig: Partial<DAOConfig>, dao?: PublicKey): ProposalAction
    mintTokens(
      mint: PublicKey,
      destination: PublicKey,
      mintAuthority: PublicKey,
      amount: bigint
    ): ProposalAction
    burnTokens(
      tokenAccount: PublicKey,
      mint: PublicKey,
      owner: PublicKey,
      amount: bigint
    ): ProposalAction
  }

  vote(proposal: PublicKey, voteType: VoteType): Promise<{ voteRecord: VoteRecord; signature: string }>
  delegate(dao: PublicKey, input: DelegateInput): Promise<{ delegation: Delegation; signature: string }>
  undelegate(dao: PublicKey): Promise<{ signature: string }>
  votingPower(dao: PublicKey | DAO, voter?: PublicKey): Promise<VotingPowerResult>
}
