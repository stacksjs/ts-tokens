/**
 * Proposal Queries
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { Proposal, ProposalStatus } from '../types'

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
