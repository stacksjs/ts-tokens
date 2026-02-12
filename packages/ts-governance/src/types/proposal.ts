/**
 * Proposal Types
 */

import type { PublicKey } from '@solana/web3.js'

export type ProposalStatus =
  | 'draft'
  | 'active'
  | 'succeeded'
  | 'defeated'
  | 'queued'
  | 'executed'
  | 'cancelled'
  | 'expired'

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

export interface Proposal {
  address: PublicKey
  dao: PublicKey
  index: bigint
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

export interface CreateProposalOptions {
  dao: PublicKey
  title: string
  description: string
  actions: ProposalAction[]
}

export interface ExecuteProposalOptions {
  proposal: PublicKey
}

export interface TreasuryActions {
  transferSOL: (recipient: PublicKey, amount: bigint) => ProposalAction
  transferToken: (mint: PublicKey, recipient: PublicKey, amount: bigint) => ProposalAction
  transferNFT: (mint: PublicKey, recipient: PublicKey) => ProposalAction
}

export interface GovernanceActions {
  updateConfig: (newConfig: Partial<import('./dao').DAOConfig>) => ProposalAction
  addVetoAuthority: (authority: PublicKey) => ProposalAction
  removeVetoAuthority: () => ProposalAction
}

export interface TokenActions {
  mint: (mint: PublicKey, recipient: PublicKey, amount: bigint) => ProposalAction
  burn: (mint: PublicKey, amount: bigint) => ProposalAction
  transferAuthority: (mint: PublicKey, newAuthority: PublicKey) => ProposalAction
}
