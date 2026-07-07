/**
 * Votes SDK Facade Tests
 */

import { describe, test, expect, mock } from 'bun:test'
import { Keypair, Connection, SystemProgram } from '@solana/web3.js'
import { createVotes } from '../src/votes'
import { calculateWeightedPower } from '../src/voting/power'
import type { Votes, VotesConfig } from '../src/votes-types'
import type { DAO, Proposal } from '../src/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(): VotesConfig {
  return {
    connection: {
      getAccountInfo: mock(() => Promise.resolve(null)),
      getParsedTokenAccountsByOwner: mock(() => Promise.resolve({ value: [] })),
      getTokenSupply: mock(() => Promise.resolve({ value: { amount: '0' } })),
      getBalance: mock(() => Promise.resolve(0)),
    } as unknown as Connection,
    wallet: Keypair.generate(),
  }
}

function makeDAO(overrides: Partial<DAO> = {}): DAO {
  const now = BigInt(Math.floor(Date.now() / 1000))
  return {
    address: Keypair.generate().publicKey,
    name: 'Test DAO',
    authority: Keypair.generate().publicKey,
    governanceToken: Keypair.generate().publicKey,
    treasury: Keypair.generate().publicKey,
    config: {
      votingPeriod: 432000n,
      quorum: 10,
      approvalThreshold: 51,
      executionDelay: 86400n,
      minProposalThreshold: 0n,
      voteWeightType: 'token',
      allowEarlyExecution: false,
      allowVoteChange: false,
    },
    proposalCount: 0n,
    totalVotingPower: 0n,
    createdAt: now,
    ...overrides,
  }
}

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  const now = BigInt(Math.floor(Date.now() / 1000))
  return {
    address: Keypair.generate().publicKey,
    dao: Keypair.generate().publicKey,
    index: 0n,
    proposer: Keypair.generate().publicKey,
    title: 'Test Proposal',
    description: 'A test proposal',
    status: 'active',
    forVotes: 0n,
    againstVotes: 0n,
    abstainVotes: 0n,
    startTime: now - 3600n,
    endTime: now + 3600n,
    actions: [],
    createdAt: now - 3600n,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// createVotes shape
// ---------------------------------------------------------------------------

describe('createVotes', () => {
  test('returns an object with all expected namespaces and methods', () => {
    const votes = createVotes(makeConfig())

    // namespaces
    expect(votes.dao).toBeDefined()
    expect(votes.proposal).toBeDefined()
    expect(votes.actions).toBeDefined()

    // dao namespace
    expect(typeof votes.dao.create).toBe('function')
    expect(typeof votes.dao.info).toBe('function')

    // proposal namespace
    expect(typeof votes.proposal.create).toBe('function')
    expect(typeof votes.proposal.status).toBe('function')
    expect(typeof votes.proposal.cancel).toBe('function')
    expect(typeof votes.proposal.execute).toBe('function')
    expect(typeof votes.proposal.list).toBe('function')

    // actions namespace
    expect(typeof votes.actions.transferFromTreasury).toBe('function')
    expect(typeof votes.actions.updateConfig).toBe('function')
    expect(typeof votes.actions.mintTokens).toBe('function')
    expect(typeof votes.actions.burnTokens).toBe('function')

    // top-level methods
    expect(typeof votes.vote).toBe('function')
    expect(typeof votes.delegate).toBe('function')
    expect(typeof votes.undelegate).toBe('function')
    expect(typeof votes.votingPower).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// votes.dao.create
// ---------------------------------------------------------------------------

describe('votes.dao.create', () => {
  test('throws not-implemented (governance program undeployed)', async () => {
    const votes = createVotes(makeConfig())
    const token = Keypair.generate().publicKey

    // createDAO does not fabricate a signature — it throws because the
    // governance program that stores DAO accounts is not deployed.
    await expect(
      votes.dao.create({
        name: 'My DAO',
        token,
        config: {
          votingPeriod: '7 days',
          quorum: 10,
          approvalThreshold: 51,
        },
      }),
    ).rejects.toThrow(/not implemented/i)
  })

  test('rejects a name longer than 32 bytes before the not-implemented throw', async () => {
    const votes = createVotes(makeConfig())
    await expect(
      votes.dao.create({
        name: 'x'.repeat(33),
        token: Keypair.generate().publicKey,
        config: { votingPeriod: '5 days', quorum: 10, approvalThreshold: 51 },
      }),
    ).rejects.toThrow(/32 bytes/i)
  })

  test('validates quorum range', async () => {
    const votes = createVotes(makeConfig())

    expect(
      votes.dao.create({
        name: 'Bad DAO',
        token: Keypair.generate().publicKey,
        config: { votingPeriod: '1 day', quorum: 0, approvalThreshold: 51 },
      }),
    ).rejects.toThrow(/quorum/i)
  })

  test('validates approvalThreshold range', async () => {
    const votes = createVotes(makeConfig())

    expect(
      votes.dao.create({
        name: 'Bad DAO',
        token: Keypair.generate().publicKey,
        config: { votingPeriod: '1 day', quorum: 10, approvalThreshold: 101 },
      }),
    ).rejects.toThrow(/threshold/i)
  })
})

// ---------------------------------------------------------------------------
// votes.proposal.create
// ---------------------------------------------------------------------------

describe('votes.proposal.create', () => {
  test('throws not-implemented for valid input (governance program undeployed)', async () => {
    const votes = createVotes(makeConfig())
    const daoAddress = Keypair.generate().publicKey

    await expect(
      votes.proposal.create({
        dao: daoAddress,
        title: 'Increase rewards',
        description: 'Double staking rewards',
        actions: [{
          programId: SystemProgram.programId,
          accounts: [],
          data: Buffer.from([0]),
        }],
      }),
    ).rejects.toThrow(/not implemented/i)
  })

  test('rejects empty actions before the not-implemented throw', async () => {
    const votes = createVotes(makeConfig())
    await expect(
      votes.proposal.create({
        dao: Keypair.generate().publicKey,
        title: 'No actions',
        description: 'missing actions',
        actions: [],
      }),
    ).rejects.toThrow(/at least one action/i)
  })
})

// ---------------------------------------------------------------------------
// votes.proposal.status
// ---------------------------------------------------------------------------

describe('votes.proposal.status', () => {
  test('evaluates quorum and threshold against the DAO config', async () => {
    const votes = createVotes(makeConfig())
    // quorum 10%, approvalThreshold 51%, totalVotingPower 100.
    const dao = makeDAO({ totalVotingPower: 100n })
    const proposal = makeProposal({
      forVotes: 70n,
      againstVotes: 20n,
      abstainVotes: 10n,
    })

    const status = await votes.proposal.status(proposal, dao)

    expect(status.status).toBe('active')
    expect(status.votesFor).toBe(70n)
    expect(status.votesAgainst).toBe(20n)
    expect(status.votesAbstain).toBe(10n)
    // 100 votes / 100 supply = 100% >= 10% quorum
    expect(status.quorumReached).toBe(true)
    // for 70 / (70+20)=77.8% >= 51% threshold
    expect(status.passingThreshold).toBe(true)
    expect(status.timeRemaining.seconds).toBeGreaterThan(0n)
  })

  test('quorumReached false when turnout is below the configured quorum', async () => {
    const votes = createVotes(makeConfig())
    const dao = makeDAO({ totalVotingPower: 10000n }) // quorum 10% => need 1000
    const proposal = makeProposal({
      forVotes: 5n,
      againstVotes: 0n,
      abstainVotes: 0n,
    })

    const status = await votes.proposal.status(proposal, dao)

    expect(status.quorumReached).toBe(false)
    expect(status.passingThreshold).toBe(false)
  })

  test('passingThreshold false when for-share is below the approval threshold', async () => {
    const votes = createVotes(makeConfig())
    const dao = makeDAO({ totalVotingPower: 100n })
    const proposal = makeProposal({
      forVotes: 30n,
      againstVotes: 70n,
      abstainVotes: 0n,
    })

    const status = await votes.proposal.status(proposal, dao)

    expect(status.passingThreshold).toBe(false)
  })

  test('without a DAO, quorum/threshold are not guessed', async () => {
    const votes = createVotes(makeConfig())
    const proposal = makeProposal({
      forVotes: 70n,
      againstVotes: 20n,
      abstainVotes: 10n,
    })

    const status = await votes.proposal.status(proposal)

    expect(status.quorumReached).toBe(false)
    expect(status.passingThreshold).toBe(false)
  })

  test('returns ended for expired proposals', async () => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const votes = createVotes(makeConfig())
    const proposal = makeProposal({
      endTime: now - 100n,
    })

    const status = await votes.proposal.status(proposal)

    expect(status.timeRemaining.seconds).toBe(0n)
    expect(status.timeRemaining.formatted).toBe('Ended')
  })
})

// ---------------------------------------------------------------------------
// votes.actions.transferFromTreasury
// ---------------------------------------------------------------------------

describe('votes.actions.transferFromTreasury', () => {
  test('dispatches to SOL transfer when no token specified', () => {
    const votes = createVotes(makeConfig())
    const from = Keypair.generate().publicKey
    const to = Keypair.generate().publicKey

    const action = votes.actions.transferFromTreasury({
      from,
      to,
      amount: 1_000_000_000n,
    })

    expect(action.programId.equals(SystemProgram.programId)).toBe(true)
    // [from (signer), to]
    expect(action.accounts[0].pubkey.equals(from)).toBe(true)
    expect(action.accounts[0].isSigner).toBe(true)
    expect(action.accounts[1].pubkey.equals(to)).toBe(true)
  })

  test('dispatches to token transfer when token specified', () => {
    const votes = createVotes(makeConfig())
    const from = Keypair.generate().publicKey
    const to = Keypair.generate().publicKey
    const token = Keypair.generate().publicKey

    const action = votes.actions.transferFromTreasury({
      from,
      to,
      amount: 500n,
      token,
    })

    expect(action.programId.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    // source token account, dest token account, owner (defaults to `from`)
    expect(action.accounts[0].pubkey.equals(from)).toBe(true)
    expect(action.accounts[1].pubkey.equals(to)).toBe(true)
    expect(action.accounts[2].pubkey.equals(from)).toBe(true)
    expect(action.accounts[2].isSigner).toBe(true)
  })

  test('converts number amount to bigint', () => {
    const votes = createVotes(makeConfig())
    const from = Keypair.generate().publicKey
    const to = Keypair.generate().publicKey

    // Should not throw — number gets converted to bigint
    const action = votes.actions.transferFromTreasury({
      from,
      to,
      amount: 1000,
    })

    expect(action).toBeDefined()
    expect(action.programId.equals(SystemProgram.programId)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// votes.vote
// ---------------------------------------------------------------------------

describe('votes.vote', () => {
  test('resolves voting power first, which is not implemented', async () => {
    const config = makeConfig()
    const votes = createVotes(config)
    const proposal = Keypair.generate().publicKey

    // castVote resolves getVotingPower first; that requires the per-proposal
    // snapshot from the undeployed program, so it throws not-implemented rather
    // than recording a fabricated vote.
    await expect(votes.vote(proposal, 'for')).rejects.toThrow(/not implemented/i)
  })

  test('accepts all three vote types (all throw, program undeployed)', () => {
    const votes = createVotes(makeConfig())
    const proposal = Keypair.generate().publicKey

    const types = ['for', 'against', 'abstain'] as const
    for (const voteType of types) {
      expect(votes.vote(proposal, voteType)).rejects.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// votes.delegate
// ---------------------------------------------------------------------------

describe('votes.delegate', () => {
  test('throws not-implemented for a valid delegation (program undeployed)', async () => {
    const votes = createVotes(makeConfig())
    const dao = Keypair.generate().publicKey
    const to = Keypair.generate().publicKey

    // delegateVotingPower validates inputs then throws — no fabricated signature.
    await expect(
      votes.delegate(dao, { to, amount: 5000n }),
    ).rejects.toThrow(/not implemented/i)
  })

  test('rejects self-delegation before the not-implemented throw', async () => {
    const config = makeConfig()
    const votes = createVotes(config)
    const dao = Keypair.generate().publicKey

    // delegate to the wallet itself
    await expect(
      votes.delegate(dao, { to: config.wallet.publicKey, amount: 1000n }),
    ).rejects.toThrow(/yourself/i)
  })

  test('rejects a past expiry before the not-implemented throw', async () => {
    const votes = createVotes(makeConfig())
    const dao = Keypair.generate().publicKey
    const to = Keypair.generate().publicKey

    // A bigint expires is treated as an absolute timestamp; 1 is in the past.
    await expect(
      votes.delegate(dao, { to, amount: 1000n, expires: 1n }),
    ).rejects.toThrow(/future/i)
  })
})

// ---------------------------------------------------------------------------
// votes.votingPower
// ---------------------------------------------------------------------------

describe('votes.votingPower', () => {
  test('throws when delegated power cannot be read (program undeployed)', async () => {
    // `own` is a real live-balance read, but the delegated component lives in
    // the undeployed governance program, so a truthful total cannot be produced.
    const config = makeConfig()
    const votes = createVotes(config)
    const dao = makeDAO()

    await expect(votes.votingPower(dao)).rejects.toThrow(/not implemented/i)
  })

  test('throws for a bare DAO address (DAO state unreadable)', async () => {
    const config = makeConfig()
    const votes = createVotes(config)
    const daoAddress = Keypair.generate().publicKey

    // getDAO throws — DAO state cannot be read while the program is undeployed.
    await expect(votes.votingPower(daoAddress)).rejects.toThrow(/not implemented/i)
  })
})

// ---------------------------------------------------------------------------
// votes.undelegate
// ---------------------------------------------------------------------------

describe('votes.undelegate', () => {
  test('throws not-implemented (program undeployed)', async () => {
    const votes = createVotes(makeConfig())
    const dao = Keypair.generate().publicKey

    await expect(votes.undelegate(dao)).rejects.toThrow(/not implemented/i)
  })
})

// ---------------------------------------------------------------------------
// calculateWeightedPower
// ---------------------------------------------------------------------------

describe('calculateWeightedPower', () => {
  test('token type returns identity', () => {
    expect(calculateWeightedPower('token', 1000n)).toBe(1000n)
  })

  test('quadratic type returns integer sqrt', () => {
    expect(calculateWeightedPower('quadratic', 100n)).toBe(10n)
    expect(calculateWeightedPower('quadratic', 10000n)).toBe(100n)
  })

  test('nft type uses nftCount option', () => {
    expect(calculateWeightedPower('nft', 0n, { nftCount: 5 })).toBe(5n)
    expect(calculateWeightedPower('nft', 1000n, { nftCount: 3 })).toBe(3n)
  })

  test('nft type defaults to 0 without nftCount', () => {
    expect(calculateWeightedPower('nft', 1000n)).toBe(0n)
  })

  test('time-weighted type applies multiplier', () => {
    const power = calculateWeightedPower('time-weighted', 1000n, {
      holdDurationSeconds: 31536000n,
      timeWeightConfig: {
        curve: 'linear',
        maxMultiplier: 3.0,
        maxDurationSeconds: 31536000n,
      },
    })
    expect(power).toBe(3000n)
  })

  test('time-weighted type defaults to 0 duration', () => {
    // 0 duration → 1x multiplier
    const power = calculateWeightedPower('time-weighted', 1000n)
    expect(power).toBe(1000n)
  })

  test('unknown type falls back to identity', () => {
    expect(calculateWeightedPower('unknown' as any, 500n)).toBe(500n)
  })
})

// ---------------------------------------------------------------------------
// votes.actions helpers
// ---------------------------------------------------------------------------

describe('votes.actions', () => {
  test('updateConfig wraps governanceActions.updateConfig', () => {
    const votes = createVotes(makeConfig())
    const action = votes.actions.updateConfig({ quorum: 20 })
    expect(action).toBeDefined()
    expect(action.programId).toBeDefined()
    expect(Buffer.isBuffer(action.data)).toBe(true)
  })

  test('mintTokens creates a ProposalAction', () => {
    const votes = createVotes(makeConfig())
    const mint = Keypair.generate().publicKey
    const destination = Keypair.generate().publicKey
    const authority = Keypair.generate().publicKey

    const action = votes.actions.mintTokens(mint, destination, authority, 1000n)
    expect(action.accounts.length).toBe(3)
    expect(action.accounts[0].pubkey.equals(mint)).toBe(true)
    expect(action.accounts[1].pubkey.equals(destination)).toBe(true)
    expect(action.accounts[2].pubkey.equals(authority)).toBe(true)
    expect(action.accounts[2].isSigner).toBe(true)
  })

  test('burnTokens creates a ProposalAction', () => {
    const votes = createVotes(makeConfig())
    const tokenAccount = Keypair.generate().publicKey
    const mint = Keypair.generate().publicKey
    const owner = Keypair.generate().publicKey

    const action = votes.actions.burnTokens(tokenAccount, mint, owner, 500n)
    expect(action.accounts.length).toBe(3)
    expect(action.accounts[0].pubkey.equals(tokenAccount)).toBe(true)
    expect(action.accounts[1].pubkey.equals(mint)).toBe(true)
    expect(action.accounts[2].pubkey.equals(owner)).toBe(true)
    expect(action.accounts[2].isSigner).toBe(true)
  })
})
