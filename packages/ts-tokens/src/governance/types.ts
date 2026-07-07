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
export type ProposalStatus =
  | 'draft'
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
 *
 * Token transfers operate on SPL token *accounts*, not wallets. Callers must
 * pass the source/destination associated token accounts (ATAs) and the owner
 * authorized to move the tokens.
 */
export interface TreasuryActions {
  /**
   * System Program transfer of lamports from `from` (the treasury/source, which
   * signs and is debited) to `recipient`.
   */
  transferSOL: (from: PublicKey, recipient: PublicKey, amount: bigint) => ProposalAction
  /**
   * SPL Token transfer. `source` and `destination` are token accounts (ATAs),
   * and `owner` is the authority that signs for the source account.
   */
  transferToken: (
    source: PublicKey,
    destination: PublicKey,
    owner: PublicKey,
    amount: bigint
  ) => ProposalAction
  /**
   * SPL Token transfer of a single NFT (amount = 1). `source`/`destination` are
   * token accounts and `owner` signs for the source account.
   */
  transferNFT: (source: PublicKey, destination: PublicKey, owner: PublicKey) => ProposalAction
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
  /**
   * SPL Token MintTo. `destination` is the token account (ATA) that receives
   * the minted tokens and `mintAuthority` signs.
   */
  mint: (
    mint: PublicKey,
    destination: PublicKey,
    mintAuthority: PublicKey,
    amount: bigint
  ) => ProposalAction
  /**
   * SPL Token Burn. `tokenAccount` holds the tokens being burned and `owner`
   * signs for it.
   */
  burn: (
    tokenAccount: PublicKey,
    mint: PublicKey,
    owner: PublicKey,
    amount: bigint
  ) => ProposalAction
  /**
   * SPL Token SetAuthority for a mint's MintTokens authority. `currentAuthority`
   * signs; `newAuthority` becomes the new mint authority.
   */
  transferAuthority: (
    mint: PublicKey,
    currentAuthority: PublicKey,
    newAuthority: PublicKey
  ) => ProposalAction
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
