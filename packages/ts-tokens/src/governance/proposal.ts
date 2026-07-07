/**
 * Proposal Management
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js'
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

/**
 * Create a new proposal
 */
export async function createProposal(
  _connection: Connection,
  _proposer: Keypair,
  options: CreateProposalOptions
): Promise<{ proposal: Proposal; signature: string }> {
  const { title, actions } = options

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

  // The governance program that stores proposals is not deployed. Deriving a PDA
  // and returning a fabricated signature would let callers believe a proposal
  // exists on-chain (and, because getDAO can't return proposalCount, every
  // proposal would collide at index 0). Fail loudly after validation.
  throw new Error(
    'createProposal is not implemented: the governance program is not deployed.'
  )
}

/**
 * Get proposal info.
 *
 * Returns null when the account does not exist; throws when it exists but cannot
 * be deserialized (governance program/layout unavailable) rather than silently
 * returning null for a live proposal.
 */
export async function getProposal(
  connection: Connection,
  address: PublicKey
): Promise<Proposal | null> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    return null
  }

  throw new Error(
    `getProposal cannot deserialize ${address.toBase58()}: the governance ` +
    `program and its account layout are not available (program not deployed).`
  )
}

/**
 * Get all proposals for a DAO.
 *
 * Not implemented — enumerating proposals needs the undeployed governance
 * program's account layout. Returning [] would be indistinguishable from a DAO
 * with no proposals.
 */
export async function getProposals(
  _connection: Connection,
  _dao: PublicKey,
  _status?: ProposalStatus
): Promise<Proposal[]> {
  throw new Error(
    'getProposals is not implemented: the governance program is not deployed.'
  )
}

/**
 * Cancel a proposal. Not implemented — governance program undeployed.
 */
export async function cancelProposal(
  _connection: Connection,
  _proposal: PublicKey,
  _authority: Keypair
): Promise<{ signature: string }> {
  throw new Error(
    'cancelProposal is not implemented: the governance program is not deployed.'
  )
}

/**
 * Queue a successful proposal for execution. Not implemented — governance
 * program undeployed (the real implementation must read the DAO's configured
 * executionDelay rather than assume a fixed 1-day timelock).
 */
export async function queueProposal(
  _connection: Connection,
  _proposal: PublicKey
): Promise<{ signature: string; executionTime: bigint }> {
  throw new Error(
    'queueProposal is not implemented: the governance program is not deployed.'
  )
}

/**
 * Execute a queued proposal. Not implemented — governance program undeployed.
 */
export async function executeProposal(
  _connection: Connection,
  _options: ExecuteProposalOptions
): Promise<{ signature: string }> {
  throw new Error(
    'executeProposal is not implemented: the governance program is not deployed.'
  )
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

  // Check approval threshold (abstain votes are neutral). If nobody voted for or
  // against (all-abstain), there is no majority to pass — guard against the
  // 0 < 0 degenerate case that would otherwise skip the threshold check.
  const decidingVotes = proposal.forVotes + proposal.againstVotes
  if (decidingVotes === 0n) {
    return { passed: false, reason: 'No deciding (for/against) votes cast' }
  }
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
  updateConfig: (_newConfig): ProposalAction => {
    // The old implementation encoded the config as JSON — which throws outright
    // on the bigint fields (votingPeriod/executionDelay/minProposalThreshold) and
    // is not a valid instruction encoding for any program (the target was
    // PublicKey.default). Refuse rather than emit a broken/crashing action.
    throw new Error(
      'governanceActions.updateConfig is not implemented: the governance program ' +
      'is not deployed, so a config-update instruction cannot be encoded.'
    )
  },

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
