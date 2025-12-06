/**
 * Governance Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * DAO configuration
 */
export interface DAOConfig {
  votingPeriod: bigint // seconds
  quorum: number // percentage (0-100)
  approvalThreshold: number // percentage (0-100)
  executionDelay: bigint // seconds after approval before execution
  minProposalThreshold: bigint // minimum tokens to create proposal
  vetoAuthority?: PublicKey
}

/**
 * DAO account
 */
export interface DAO {
  address: PublicKey
  name: string
  governanceToken: PublicKey
  treasury: PublicKey
  config: DAOConfig
  proposalCount: bigint
  totalVotingPower: bigint
  createdAt: bigint
}

/**
 * Proposal status
 */
export type ProposalStatus
  = | 'draft'
    | 'active'
    | 'succeeded'
    | 'defeated'
    | 'queued'
    | 'executed'
    | 'cancelled'
    | 'expired'

/**
 * Proposal
 */
export interface Proposal {
  address: PublicKey
  dao: PublicKey
  proposer: PublicKey
  title: string
  description: string
  status: ProposalStatus
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  startTime: bigint
  endTime: bigint
  executionTime?: bigint
  actions: ProposalAction[]
  createdAt: bigint
}

/**
 * Proposal action
 */
export interface ProposalAction {
  programId: PublicKey
  accounts: AccountMeta[]
  data: Buffer
}

export interface AccountMeta {
  pubkey: PublicKey
  isSigner: boolean
  isWritable: boolean
}

/**
 * Vote record
 */
export interface VoteRecord {
  proposal: PublicKey
  voter: PublicKey
  voteType: VoteType
  votingPower: bigint
  timestamp: bigint
}

export type VoteType = 'for' | 'against' | 'abstain'

/**
 * Create DAO options
 */
export interface CreateDAOOptions {
  name: string
  governanceToken: PublicKey
  config: {
    votingPeriod: string | bigint // e.g., '5 days' or seconds
    quorum: number
    approvalThreshold: number
    executionDelay?: string | bigint
    minProposalThreshold?: bigint
    vetoAuthority?: PublicKey
  }
}

/**
 * Create proposal options
 */
export interface CreateProposalOptions {
  dao: PublicKey
  title: string
  description: string
  actions: ProposalAction[]
}

/**
 * Vote options
 */
export interface VoteOptions {
  proposal: PublicKey
  voteType: VoteType
}

/**
 * Execute proposal options
 */
export interface ExecuteProposalOptions {
  proposal: PublicKey
}

/**
 * Treasury action builders
 */
export interface TreasuryActions {
  transferSOL: (recipient: PublicKey, amount: bigint) => ProposalAction
  transferToken: (mint: PublicKey, recipient: PublicKey, amount: bigint) => ProposalAction
  transferNFT: (mint: PublicKey, recipient: PublicKey) => ProposalAction
}

/**
 * Governance action builders
 */
export interface GovernanceActions {
  updateConfig: (newConfig: Partial<DAOConfig>) => ProposalAction
  addVetoAuthority: (authority: PublicKey) => ProposalAction
  removeVetoAuthority: () => ProposalAction
}

/**
 * Token action builders
 */
export interface TokenActions {
  mint: (mint: PublicKey, recipient: PublicKey, amount: bigint) => ProposalAction
  burn: (mint: PublicKey, amount: bigint) => ProposalAction
  transferAuthority: (mint: PublicKey, newAuthority: PublicKey) => ProposalAction
}

/**
 * Delegation
 */
export interface Delegation {
  delegator: PublicKey
  delegate: PublicKey
  amount: bigint
  timestamp: bigint
}

/**
 * Voting power snapshot
 */
export interface VotingPowerSnapshot {
  voter: PublicKey
  votingPower: bigint
  delegatedPower: bigint
  totalPower: bigint
  snapshotTime: bigint
}
