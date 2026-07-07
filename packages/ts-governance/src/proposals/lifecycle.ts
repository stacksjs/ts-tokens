/**
 * Proposal Lifecycle
 */

import type { Connection, Keypair, PublicKey } from '@solana/web3.js'
import type { DAOConfig, Proposal, ExecuteProposalOptions } from '../types'

/**
 * Cancel a proposal.
 *
 * Depends on the governance program (undeployed) to mutate proposal state, so
 * this throws rather than returning a fabricated signature for a cancellation
 * that never happened.
 */
export async function cancelProposal(
  _connection: Connection,
  _proposal: PublicKey,
  _authority: Keypair
): Promise<{ signature: string }> {
  throw new Error(
    'cancelProposal is not implemented: the governance program that stores ' +
    'proposal state is not deployed. The proposal was not cancelled on-chain.'
  )
}

/**
 * Queue a successful proposal for execution.
 *
 * Depends on the governance program (undeployed) to move the proposal into the
 * queued state, so this throws rather than returning a fabricated signature. The
 * DAO config is required so the caller uses the DAO's configured executionDelay
 * (rather than a hardcoded value) when a real implementation lands.
 */
export async function queueProposal(
  _connection: Connection,
  _proposal: PublicKey,
  _config: Pick<DAOConfig, 'executionDelay'>
): Promise<{ signature: string; executionTime: bigint }> {
  throw new Error(
    'queueProposal is not implemented: the governance program that stores ' +
    'proposal state is not deployed. The proposal was not queued on-chain.'
  )
}

/**
 * Execute a queued proposal.
 *
 * Depends on the governance program (undeployed) to validate proposal state and
 * dispatch its actions, so this throws rather than returning a fabricated
 * signature for an execution that never happened.
 */
export async function executeProposal(
  _connection: Connection,
  _options: ExecuteProposalOptions
): Promise<{ signature: string }> {
  throw new Error(
    'executeProposal is not implemented: the governance program that executes ' +
    'proposals is not deployed. The proposal was not executed on-chain.'
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
  if (totalVotes * 100n < totalVotingPower * BigInt(quorum)) {
    return { passed: false, reason: 'Quorum not reached' }
  }

  // Abstain votes are neutral for the approval threshold. If there are no
  // deciding (for/against) votes at all — e.g. an all-abstain proposal — there
  // is no support to approve, so the proposal fails. Without this guard the
  // threshold check would be `0 < 0` (false) and wrongly report passed.
  const decidingVotes = proposal.forVotes + proposal.againstVotes
  if (decidingVotes === 0n) {
    return { passed: false, reason: 'No deciding votes cast' }
  }
  if (proposal.forVotes * 100n < decidingVotes * BigInt(approvalThreshold)) {
    return { passed: false, reason: 'Approval threshold not met' }
  }

  return { passed: true, reason: 'Proposal passed' }
}
