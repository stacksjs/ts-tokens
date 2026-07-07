/**
 * Proposal Creation
 */

import type { Connection, Keypair } from '@solana/web3.js'
import type { Proposal, CreateProposalOptions } from '../types'

/**
 * Create a new proposal.
 *
 * Validates the proposal inputs, but does not fabricate a transaction: the
 * governance program that persists proposal accounts (and the DAO state needed
 * to derive the proposal index and voting window) is not deployed, so this
 * throws rather than returning a fake signature. Input validation runs first so
 * callers still get a meaningful error for bad input.
 */
export async function createProposal(
  _connection: Connection,
  _proposer: Keypair,
  options: CreateProposalOptions
): Promise<{ proposal: Proposal; signature: string }> {
  const { title, actions } = options

  if (!title || title.length === 0) {
    throw new Error('Title is required')
  }
  if (title.length > 100) {
    throw new Error('Title must be 100 characters or less')
  }
  if (actions.length === 0) {
    throw new Error('At least one action is required')
  }

  throw new Error(
    'createProposal is not implemented: the governance program that stores ' +
    'proposal accounts is not deployed. No proposal was created on-chain.'
  )
}
