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

export interface GovernanceActions {
  updateConfig: (newConfig: Partial<import('./dao').DAOConfig>, dao?: PublicKey) => ProposalAction
  addVetoAuthority: (authority: PublicKey) => ProposalAction
  removeVetoAuthority: () => ProposalAction
}

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
