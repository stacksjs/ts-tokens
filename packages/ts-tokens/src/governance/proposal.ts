/**
 * Proposal Management
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js'
import { getProposalAddress } from 'ts-governance/programs'
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

  // Derive deterministic PDA address from DAO and proposal index
  const proposalIndex = daoInfo?.proposalCount ?? 0n
  const proposalAddress = getProposalAddress(dao, proposalIndex)

  const proposal: Proposal = {
    address: proposalAddress,
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
    signature: `proposal_created_${proposalAddress.toBase58().slice(0, 8)}`,
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
  _connection: Connection,
  _dao: PublicKey,
  _status?: ProposalStatus
): Promise<Proposal[]> {
  // In production, would use getProgramAccounts with filters
  return []
}

/**
 * Cancel a proposal
 */
export async function cancelProposal(
  _connection: Connection,
  proposal: PublicKey,
  _authority: Keypair
): Promise<{ signature: string }> {
  return {
    signature: `proposal_cancelled_${proposal.toBase58().slice(0, 8)}`,
  }
}

/**
 * Queue a successful proposal for execution
 */
export async function queueProposal(
  _connection: Connection,
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
  _connection: Connection,
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

  // Compare via cross-multiplication to avoid floor-division rounding that
  // would let a proposal just below the bar pass.
  // Check quorum
  if (totalVotes * 100n < totalVotingPower * BigInt(quorum)) {
    return { passed: false, reason: 'Quorum not reached' }
  }

  // Check approval threshold (abstain votes are neutral)
  const decidingVotes = proposal.forVotes + proposal.againstVotes
  if (proposal.forVotes * 100n < decidingVotes * BigInt(approvalThreshold)) {
    return { passed: false, reason: 'Approval threshold not met' }
  }

  return { passed: true, reason: 'Proposal passed' }
}

// Action builders

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

/**
 * Encode a u64 as 8 little-endian bytes. Uses writeBigUInt64LE so the byte
 * order is fixed regardless of host endianness (a raw BigUint64Array buffer is
 * platform-endian-dependent and would corrupt the amount on big-endian hosts).
 */
function u64le(value: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(value)
  return buf
}

/**
 * Treasury action builders
 */
export const treasuryActions: TreasuryActions = {
  transferSOL: (from: PublicKey, recipient: PublicKey, amount: bigint): ProposalAction => ({
    programId: SystemProgram.programId,
    accounts: [
      { pubkey: from, isSigner: true, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    // System Program Transfer: 4-byte u32 LE instruction index (2) + u64 LE lamports.
    data: Buffer.concat([Buffer.from([2, 0, 0, 0]), u64le(amount)]),
  }),

  // source/destination are SPL token accounts (ATAs); owner signs for source.
  transferToken: (
    source: PublicKey,
    destination: PublicKey,
    owner: PublicKey,
    amount: bigint
  ): ProposalAction => ({
    programId: TOKEN_PROGRAM_ID,
    accounts: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    // SPL Token Transfer (3) + u64 LE amount.
    data: Buffer.concat([Buffer.from([3]), u64le(amount)]),
  }),

  // source/destination are SPL token accounts (ATAs); owner signs for source.
  transferNFT: (source: PublicKey, destination: PublicKey, owner: PublicKey): ProposalAction => ({
    programId: TOKEN_PROGRAM_ID,
    accounts: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    // SPL Token Transfer (3) of exactly 1 token.
    data: Buffer.concat([Buffer.from([3]), u64le(1n)]),
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
  // destination is the SPL token account (ATA) that receives minted tokens.
  mint: (
    mint: PublicKey,
    destination: PublicKey,
    mintAuthority: PublicKey,
    amount: bigint
  ): ProposalAction => ({
    programId: TOKEN_PROGRAM_ID,
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: mintAuthority, isSigner: true, isWritable: false },
    ],
    // SPL Token MintTo (7) + u64 LE amount.
    data: Buffer.concat([Buffer.from([7]), u64le(amount)]),
  }),

  // tokenAccount holds the tokens being burned; owner signs for it.
  burn: (
    tokenAccount: PublicKey,
    mint: PublicKey,
    owner: PublicKey,
    amount: bigint
  ): ProposalAction => ({
    programId: TOKEN_PROGRAM_ID,
    accounts: [
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    // SPL Token Burn (8) + u64 LE amount.
    data: Buffer.concat([Buffer.from([8]), u64le(amount)]),
  }),

  transferAuthority: (
    mint: PublicKey,
    currentAuthority: PublicKey,
    newAuthority: PublicKey
  ): ProposalAction => ({
    programId: TOKEN_PROGRAM_ID,
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: currentAuthority, isSigner: true, isWritable: false },
    ],
    // SPL Token SetAuthority (6): [instruction, authorityType (0=MintTokens),
    // newAuthority option (1=Some)] followed by the 32-byte new authority.
    data: Buffer.concat([Buffer.from([6, 0, 1]), newAuthority.toBuffer()]),
  }),
}
