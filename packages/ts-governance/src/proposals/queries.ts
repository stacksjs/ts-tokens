/**
 * Proposal Queries
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { Proposal, ProposalStatus } from '../types'

/**
 * Get proposal info.
 *
 * Proposal accounts are owned by the governance program, which is not deployed,
 * so there is no account data to deserialize. Returning null would be
 * indistinguishable from "the proposal does not exist", so this throws instead.
 */
export async function getProposal(
  _connection: Connection,
  _address: PublicKey
): Promise<Proposal | null> {
  throw new Error(
    'getProposal is not implemented: the governance program that owns proposal ' +
    'accounts is not deployed, so proposal state cannot be read from the chain.'
  )
}

/**
 * Get all proposals for a DAO.
 *
 * Would rely on getProgramAccounts against the governance program, which is not
 * deployed. Returning an empty array would falsely imply "no proposals", so this
 * throws instead.
 */
export async function getProposals(
  _connection: Connection,
  _dao: PublicKey,
  _status?: ProposalStatus
): Promise<Proposal[]> {
  throw new Error(
    'getProposals is not implemented: the governance program that owns proposal ' +
    'accounts is not deployed, so proposals cannot be listed from the chain.'
  )
}
