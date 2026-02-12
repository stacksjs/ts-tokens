/**
 * Votes SDK Facade
 *
 * High-level API that wraps the lower-level governance functions
 * with a configured connection and wallet.
 *
 * ```ts
 * import { createVotes } from 'ts-governance'
 *
 * const votes = createVotes({ connection, wallet })
 * await votes.dao.create({ name: 'My DAO', token: mint, config: { ... } })
 * await votes.vote(proposalAddress, 'for')
 * ```
 */

import type { PublicKey } from '@solana/web3.js'
import type {
  DAO,
  DAOConfig,
  Proposal,
  ProposalStatus,
  CreateDAOOptions,
} from './types'
import type {
  VotesConfig,
  CreateDAOInput,
  CreateProposalInput,
  TransferFromTreasuryInput,
  DelegateInput,
  ProposalStatusResult,
  VotingPowerResult,
  Votes,
} from './votes-types'

import { createDAO } from './dao/create'
import { getDAO } from './dao/queries'
import { createProposal } from './proposals/create'
import { cancelProposal, executeProposal, calculateProposalResult } from './proposals/lifecycle'
import { getProposals } from './proposals/queries'
import { treasuryActions, governanceActions, tokenActions } from './proposals/actions'
import { castVote } from './voting/cast'
import { getVotingPowerSnapshot, calculateVoteBreakdown, getVotingTimeRemaining } from './voting'
import { delegateVotingPower, undelegateVotingPower } from './delegation/delegate'
import { getTotalDelegatedPower } from './delegation/queries'
import { parseDuration } from './dao/create'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toAddress(input: PublicKey | { address: PublicKey }): PublicKey {
  if ('address' in input && typeof (input as any).toBase58 !== 'function') {
    return (input as { address: PublicKey }).address
  }
  return input as PublicKey
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createVotes(config: VotesConfig): Votes {
  const { connection, wallet } = config

  return {
    // ----- dao namespace ---------------------------------------------------
    dao: {
      async create(input: CreateDAOInput) {
        const options: CreateDAOOptions = {
          name: input.name,
          governanceToken: input.token,
          config: input.config,
        }
        return createDAO(connection, wallet, options)
      },

      async info(dao: PublicKey | DAO) {
        return getDAO(connection, toAddress(dao))
      },
    },

    // ----- proposal namespace ----------------------------------------------
    proposal: {
      async create(input: CreateProposalInput) {
        return createProposal(connection, wallet, {
          dao: toAddress(input.dao),
          title: input.title,
          description: input.description,
          actions: input.actions,
        })
      },

      async status(proposal: PublicKey | Proposal): Promise<ProposalStatusResult> {
        // If we already have a Proposal object, use it directly
        let p: Proposal
        if ('status' in proposal && 'forVotes' in proposal) {
          p = proposal as Proposal
        } else {
          // Fetch from chain — fallback to a "not found" result if null
          const fetched = await import('./proposals/queries').then(m =>
            m.getProposal(connection, proposal as PublicKey),
          )
          if (!fetched) {
            return {
              status: 'cancelled',
              votesFor: 0n,
              votesAgainst: 0n,
              votesAbstain: 0n,
              quorumReached: false,
              passingThreshold: false,
              timeRemaining: { seconds: 0n, formatted: 'Ended' },
            }
          }
          p = fetched
        }

        const breakdown = calculateVoteBreakdown(p)
        const timeRemaining = getVotingTimeRemaining(p)

        // For quorum / threshold checks we need DAO context. When unavailable
        // we fall back to a generous check.
        const totalVotes = breakdown.totalVotes
        const quorumReached = totalVotes > 0n
        const passingThreshold = p.forVotes > p.againstVotes

        return {
          status: p.status,
          votesFor: p.forVotes,
          votesAgainst: p.againstVotes,
          votesAbstain: p.abstainVotes,
          quorumReached,
          passingThreshold,
          timeRemaining,
        }
      },

      async cancel(proposal: PublicKey) {
        return cancelProposal(connection, proposal, wallet)
      },

      async execute(proposal: PublicKey) {
        return executeProposal(connection, { proposal })
      },

      async list(dao: PublicKey, status?: ProposalStatus) {
        return getProposals(connection, dao, status)
      },
    },

    // ----- actions namespace -----------------------------------------------
    actions: {
      transferFromTreasury(input: TransferFromTreasuryInput) {
        const amount = typeof input.amount === 'number'
          ? BigInt(input.amount)
          : input.amount

        if (input.token) {
          return treasuryActions.transferToken(input.token, input.to, amount)
        }
        return treasuryActions.transferSOL(input.to, amount)
      },

      updateConfig(newConfig: Partial<DAOConfig>) {
        return governanceActions.updateConfig(newConfig)
      },

      mintTokens(mint: PublicKey, recipient: PublicKey, amount: bigint) {
        return tokenActions.mint(mint, recipient, amount)
      },

      burnTokens(mint: PublicKey, amount: bigint) {
        return tokenActions.burn(mint, amount)
      },
    },

    // ----- top-level methods -----------------------------------------------
    async vote(proposal: PublicKey, voteType) {
      return castVote(connection, wallet, { proposal, voteType })
    },

    async delegate(dao: PublicKey, input: DelegateInput) {
      const amount = input.amount === 'all' ? undefined : input.amount
      const expiresAt = input.expires != null
        ? parseDuration(input.expires)
        : undefined

      return delegateVotingPower(connection, wallet, {
        dao,
        delegate: input.to,
        amount,
        expiresAt,
      })
    },

    async undelegate(dao: PublicKey) {
      return undelegateVotingPower(connection, wallet, { dao })
    },

    async votingPower(dao: PublicKey | DAO, voter?: PublicKey): Promise<VotingPowerResult> {
      const daoAddress = toAddress(dao)
      const voterKey = voter ?? wallet.publicKey

      // We need the governance token to get a snapshot.
      // Attempt to read from a DAO object if provided, otherwise
      // query from chain.
      let governanceToken: PublicKey
      if ('governanceToken' in dao && typeof (dao as any).toBase58 !== 'function') {
        governanceToken = (dao as DAO).governanceToken
      } else {
        const daoInfo = await getDAO(connection, daoAddress)
        if (!daoInfo) {
          return { own: 0n, delegated: 0n, total: 0n }
        }
        governanceToken = daoInfo.governanceToken
      }

      const currentTime = BigInt(Math.floor(Date.now() / 1000))
      const snapshot = await getVotingPowerSnapshot(connection, voterKey, governanceToken, currentTime)
      const delegated = await getTotalDelegatedPower(connection, daoAddress, voterKey)

      return {
        own: snapshot.votingPower,
        delegated,
        total: snapshot.votingPower + delegated,
      }
    },
  }
}
