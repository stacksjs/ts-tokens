/**
 * Proposal Management
 */

import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js'
import type {
  Proposal,
  ProposalStatus,
  ProposalAction,
  CreateProposalOptions,
  ExecuteProposalOptions,
  TreasuryActions,
  GovernanceActions,
  TokenActions,
} from './types'
import { getDAO } from './dao'

/**
 * Create a new proposal
 */
export async function createProposal(
  connection: Connection,
  proposer: Keypair,
  options: CreateProposalOptions
): Promise<{ proposal: Proposal; signature: string }> {
  const { dao, title, description, actions } = options

  // Validate
  if (!title || title.length === 0) {
    throw new Error('Title is required')
  }
  if (title.length > 100) {
    throw new Error('Title must be 100 characters or less')
  }
  if (actions.length === 0) {
    throw new Error('At least one action is required')
  }

  // Get DAO info
  const daoInfo = await getDAO(connection, dao)
  const currentTime = BigInt(Math.floor(Date.now() / 1000))

  // Generate proposal address
  const proposalKeypair = Keypair.generate()

  const proposal: Proposal = {
    address: proposalKeypair.publicKey,
    dao,
    proposer: proposer.publicKey,
    title,
    description,
    status: 'active',
    forVotes: 0n,
    againstVotes: 0n,
    abstainVotes: 0n,
    startTime: currentTime,
    endTime: currentTime + (daoInfo?.config.votingPeriod ?? 432000n), // 5 days default
    actions,
    createdAt: currentTime,
  }

  return {
    proposal,
    signature: `proposal_created_${proposalKeypair.publicKey.toBase58().slice(0, 8)}`,
  }
}

/**
 * Get proposal info
 */
export async function getProposal(
  connection: Connection,
  address: PublicKey
): Promise<Proposal | null> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    return null
  }

  // In production, would deserialize from account data
  return null
}

/**
 * Get all proposals for a DAO
 */
export async function getProposals(
  connection: Connection,
  dao: PublicKey,
  status?: ProposalStatus
): Promise<Proposal[]> {
  // In production, would use getProgramAccounts with filters
  return []
}

/**
 * Cancel a proposal
 */
export async function cancelProposal(
  connection: Connection,
  proposal: PublicKey,
  authority: Keypair
): Promise<{ signature: string }> {
  return {
    signature: `proposal_cancelled_${proposal.toBase58().slice(0, 8)}`,
  }
}

/**
 * Queue a successful proposal for execution
 */
export async function queueProposal(
  connection: Connection,
  proposal: PublicKey
): Promise<{ signature: string; executionTime: bigint }> {
  const currentTime = BigInt(Math.floor(Date.now() / 1000))
  const executionDelay = 86400n // 1 day

  return {
    signature: `proposal_queued_${proposal.toBase58().slice(0, 8)}`,
    executionTime: currentTime + executionDelay,
  }
}

/**
 * Execute a queued proposal
 */
export async function executeProposal(
  connection: Connection,
  options: ExecuteProposalOptions
): Promise<{ signature: string }> {
  const { proposal } = options

  // In production, would execute all proposal actions
  return {
    signature: `proposal_executed_${proposal.toBase58().slice(0, 8)}`,
  }
}

/**
 * Check if proposal can be executed
 */
export function canExecuteProposal(proposal: Proposal): {
  canExecute: boolean
  reason?: string
} {
  const currentTime = BigInt(Math.floor(Date.now() / 1000))

  if (proposal.status !== 'queued') {
    return { canExecute: false, reason: 'Proposal is not queued' }
  }

  if (proposal.executionTime && currentTime < proposal.executionTime) {
    return { canExecute: false, reason: 'Execution delay not passed' }
  }

  return { canExecute: true }
}

/**
 * Calculate proposal result
 */
export function calculateProposalResult(
  proposal: Proposal,
  quorum: number,
  approvalThreshold: number,
  totalVotingPower: bigint
): { passed: boolean; reason: string } {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes

  // Check quorum
  const quorumRequired = (totalVotingPower * BigInt(quorum)) / 100n
  if (totalVotes < quorumRequired) {
    return { passed: false, reason: 'Quorum not reached' }
  }

  // Check approval threshold
  const approvalRequired = (totalVotes * BigInt(approvalThreshold)) / 100n
  if (proposal.forVotes < approvalRequired) {
    return { passed: false, reason: 'Approval threshold not met' }
  }

  return { passed: true, reason: 'Proposal passed' }
}

// Action builders

/**
 * Treasury action builders
 */
export const treasuryActions: TreasuryActions = {
  transferSOL: (recipient: PublicKey, amount: bigint): ProposalAction => ({
    programId: SystemProgram.programId,
    accounts: [
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([2, ...new Uint8Array(new BigUint64Array([amount]).buffer)]),
  }),

  transferToken: (mint: PublicKey, recipient: PublicKey, amount: bigint): ProposalAction => ({
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([3, ...new Uint8Array(new BigUint64Array([amount]).buffer)]),
  }),

  transferNFT: (mint: PublicKey, recipient: PublicKey): ProposalAction => ({
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([3, 1, 0, 0, 0, 0, 0, 0, 0]), // Transfer 1
  }),
}

/**
 * Governance action builders
 */
export const governanceActions: GovernanceActions = {
  updateConfig: (newConfig): ProposalAction => ({
    programId: PublicKey.default, // Would be governance program
    accounts: [],
    data: Buffer.from(JSON.stringify(newConfig)),
  }),

  addVetoAuthority: (authority: PublicKey): ProposalAction => ({
    programId: PublicKey.default,
    accounts: [{ pubkey: authority, isSigner: false, isWritable: false }],
    data: Buffer.from([1]),
  }),

  removeVetoAuthority: (): ProposalAction => ({
    programId: PublicKey.default,
    accounts: [],
    data: Buffer.from([2]),
  }),
}

/**
 * Token action builders
 */
export const tokenActions: TokenActions = {
  mint: (mint: PublicKey, recipient: PublicKey, amount: bigint): ProposalAction => ({
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([7, ...new Uint8Array(new BigUint64Array([amount]).buffer)]),
  }),

  burn: (mint: PublicKey, amount: bigint): ProposalAction => ({
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([8, ...new Uint8Array(new BigUint64Array([amount]).buffer)]),
  }),

  transferAuthority: (mint: PublicKey, newAuthority: PublicKey): ProposalAction => ({
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: newAuthority, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([6, 0]),
  }),
}
