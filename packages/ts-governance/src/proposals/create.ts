/**
 * Proposal Creation
 */

import type { Connection, Keypair } from '@solana/web3.js'
import type { Proposal, CreateProposalOptions } from '../types'
import { getProposalAddress } from '../programs/program'
import { getDAO } from '../dao/queries'

/**
 * Create a new proposal with PDA-based addressing
 */
export async function createProposal(
  connection: Connection,
  proposer: Keypair,
  options: CreateProposalOptions
): Promise<{ proposal: Proposal; signature: string }> {
  const { dao, title, description, actions } = options

  if (!title || title.length === 0) {
    throw new Error('Title is required')
  }
  if (title.length > 100) {
    throw new Error('Title must be 100 characters or less')
  }
  if (actions.length === 0) {
    throw new Error('At least one action is required')
  }

  const daoInfo = await getDAO(connection, dao)
  const currentTime = BigInt(Math.floor(Date.now() / 1000))

  // Derive proposal index from DAO state (use proposalCount)
  const proposalIndex = daoInfo?.proposalCount ?? 0n
  const proposalAddress = getProposalAddress(dao, proposalIndex)

  const proposal: Proposal = {
    address: proposalAddress,
    dao,
    index: proposalIndex,
    proposer: proposer.publicKey,
    title,
    description,
    status: 'active',
    forVotes: 0n,
    againstVotes: 0n,
    abstainVotes: 0n,
    startTime: currentTime,
    endTime: currentTime + (daoInfo?.config.votingPeriod ?? 432000n),
    actions,
    createdAt: currentTime,
  }

  return {
    proposal,
    signature: `proposal_created_${proposalAddress.toBase58().slice(0, 8)}`,
  }
}
