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
import { getVotingPowerSnapshot, getVotingTimeRemaining } from './voting'
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

      async status(proposal: PublicKey | Proposal, dao?: DAO): Promise<ProposalStatusResult> {
        // If we already have a Proposal object, use it directly. Otherwise the
        // proposal must be read from the (undeployed) governance program, which
        // throws — we do not invent a lifecycle state for a proposal we can't
        // read.
        let p: Proposal
        if ('status' in proposal && 'forVotes' in proposal) {
          p = proposal as Proposal
        } else {
          const fetched = await import('./proposals/queries').then(m =>
            m.getProposal(connection, proposal as PublicKey),
          )
          if (!fetched) {
            throw new Error(
              `Proposal ${(proposal as PublicKey).toBase58()} not found`,
            )
          }
          p = fetched
        }

        const timeRemaining = getVotingTimeRemaining(p)

        // Quorum and approval are evaluated against the DAO's configured
        // thresholds and total voting power. Without the DAO context those
        // percentages cannot be judged, so both are reported false rather than
        // guessed from raw vote counts.
        let quorumReached = false
        let passingThreshold = false
        if (dao) {
          const result = calculateProposalResult(
            p,
            dao.config.quorum,
            dao.config.approvalThreshold,
            dao.totalVotingPower,
          )
          quorumReached = result.reason !== 'Quorum not reached'
          passingThreshold = result.passed
        }

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
          // For token transfers, `from`/`to` are the source/destination token
          // accounts and `owner` (defaulting to the source) signs.
          const owner = input.owner ?? input.from
          return treasuryActions.transferToken(input.from, input.to, owner, amount)
        }
        return treasuryActions.transferSOL(input.from, input.to, amount)
      },

      updateConfig(newConfig: Partial<DAOConfig>, dao?: PublicKey) {
        return governanceActions.updateConfig(newConfig, dao)
      },

      mintTokens(
        mint: PublicKey,
        destination: PublicKey,
        mintAuthority: PublicKey,
        amount: bigint
      ) {
        return tokenActions.mint(mint, destination, mintAuthority, amount)
      },

      burnTokens(
        tokenAccount: PublicKey,
        mint: PublicKey,
        owner: PublicKey,
        amount: bigint
      ) {
        return tokenActions.burn(tokenAccount, mint, owner, amount)
      },
    },

    // ----- top-level methods -----------------------------------------------
    async vote(proposal: PublicKey, voteType) {
      return castVote(connection, wallet, { proposal, voteType })
    },

    async delegate(dao: PublicKey, input: DelegateInput) {
      const amount = input.amount === 'all' ? undefined : input.amount
      // A string like "7 days" is a relative duration → convert to an absolute
      // unix timestamp; a bigint is treated as an already-absolute timestamp.
      let expiresAt: bigint | undefined
      if (input.expires != null) {
        expiresAt = typeof input.expires === 'string'
          ? BigInt(Math.floor(Date.now() / 1000)) + parseDuration(input.expires)
          : input.expires
      }

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

      // The governance token is needed to read the voter's live balance. A DAO
      // object supplies it directly; a bare address would require reading DAO
      // state from the undeployed governance program (getDAO throws).
      let governanceToken: PublicKey
      if ('governanceToken' in dao && typeof (dao as any).toBase58 !== 'function') {
        governanceToken = (dao as DAO).governanceToken
      } else {
        // Throws: DAO state cannot be read while the program is undeployed.
        const daoInfo = await getDAO(connection, daoAddress)
        governanceToken = daoInfo!.governanceToken
      }

      const currentTime = BigInt(Math.floor(Date.now() / 1000))
      const snapshot = await getVotingPowerSnapshot(connection, voterKey, governanceToken, currentTime)

      // Delegated power lives in the (undeployed) governance program's
      // delegation accounts, so getTotalDelegatedPower throws. The voter's own
      // live balance is real, but a truthful *total* cannot include delegated
      // power that we cannot read — so surface that rather than reporting 0n.
      const delegated = await getTotalDelegatedPower(connection, daoAddress, voterKey)

      return {
        own: snapshot.votingPower,
        delegated,
        total: snapshot.votingPower + delegated,
      }
    },
  }
}
