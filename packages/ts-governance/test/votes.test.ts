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
  test('maps token to governanceToken and returns a DAO', async () => {
    const config = makeConfig()
    const votes = createVotes(config)
    const token = Keypair.generate().publicKey

    const result = await votes.dao.create({
      name: 'My DAO',
      token,
      config: {
        votingPeriod: '7 days',
        quorum: 10,
        approvalThreshold: 51,
      },
    })

    expect(result.dao).toBeDefined()
    expect(result.dao.name).toBe('My DAO')
    expect(result.dao.governanceToken.equals(token)).toBe(true)
    expect(result.signature).toBeDefined()
  })

  test('parses string durations in config', async () => {
    const votes = createVotes(makeConfig())
    const result = await votes.dao.create({
      name: 'Duration DAO',
      token: Keypair.generate().publicKey,
      config: {
        votingPeriod: '5 days',
        quorum: 15,
        approvalThreshold: 66,
        executionDelay: '2 days',
      },
    })

    // 5 days = 432000 seconds, 2 days = 172800 seconds
    expect(result.dao.config.votingPeriod).toBe(432000n)
    expect(result.dao.config.executionDelay).toBe(172800n)
  })

  test('accepts bigint durations directly', async () => {
    const votes = createVotes(makeConfig())
    const result = await votes.dao.create({
      name: 'BigInt DAO',
      token: Keypair.generate().publicKey,
      config: {
        votingPeriod: 86400n,
        quorum: 10,
        approvalThreshold: 51,
      },
    })

    expect(result.dao.config.votingPeriod).toBe(86400n)
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
  test('accepts PublicKey for dao field', async () => {
    const votes = createVotes(makeConfig())
    const daoAddress = Keypair.generate().publicKey

    const result = await votes.proposal.create({
      dao: daoAddress,
      title: 'Increase rewards',
      description: 'Double staking rewards',
      actions: [{
        programId: SystemProgram.programId,
        accounts: [],
        data: Buffer.from([0]),
      }],
    })

    expect(result.proposal).toBeDefined()
    expect(result.proposal.title).toBe('Increase rewards')
  })

  test('accepts DAO object for dao field', async () => {
    const votes = createVotes(makeConfig())
    const dao = makeDAO()

    const result = await votes.proposal.create({
      dao,
      title: 'Config update',
      description: 'Update quorum',
      actions: [{
        programId: SystemProgram.programId,
        accounts: [],
        data: Buffer.from([1]),
      }],
    })

    expect(result.proposal).toBeDefined()
    expect(result.proposal.dao.equals(dao.address)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// votes.proposal.status
// ---------------------------------------------------------------------------

describe('votes.proposal.status', () => {
  test('returns rich status from a Proposal object', async () => {
    const votes = createVotes(makeConfig())
    const proposal = makeProposal({
      forVotes: 70n,
      againstVotes: 20n,
      abstainVotes: 10n,
    })

    const status = await votes.proposal.status(proposal)

    expect(status.status).toBe('active')
    expect(status.votesFor).toBe(70n)
    expect(status.votesAgainst).toBe(20n)
    expect(status.votesAbstain).toBe(10n)
    expect(status.quorumReached).toBe(true) // totalVotes > 0
    expect(status.passingThreshold).toBe(true) // for > against
    expect(status.timeRemaining.seconds).toBeGreaterThan(0n)
  })

  test('returns quorumReached false when no votes', async () => {
    const votes = createVotes(makeConfig())
    const proposal = makeProposal({
      forVotes: 0n,
      againstVotes: 0n,
      abstainVotes: 0n,
    })

    const status = await votes.proposal.status(proposal)

    expect(status.quorumReached).toBe(false)
  })

  test('returns passingThreshold false when against > for', async () => {
    const votes = createVotes(makeConfig())
    const proposal = makeProposal({
      forVotes: 30n,
      againstVotes: 70n,
      abstainVotes: 0n,
    })

    const status = await votes.proposal.status(proposal)

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
    const to = Keypair.generate().publicKey

    const action = votes.actions.transferFromTreasury({
      to,
      amount: 1_000_000_000n,
    })

    expect(action.programId.equals(SystemProgram.programId)).toBe(true)
    expect(action.accounts[0].pubkey.equals(to)).toBe(true)
  })

  test('dispatches to token transfer when token specified', () => {
    const votes = createVotes(makeConfig())
    const to = Keypair.generate().publicKey
    const token = Keypair.generate().publicKey

    const action = votes.actions.transferFromTreasury({
      to,
      amount: 500n,
      token,
    })

    expect(action.programId.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    expect(action.accounts[0].pubkey.equals(token)).toBe(true)
    expect(action.accounts[1].pubkey.equals(to)).toBe(true)
  })

  test('converts number amount to bigint', () => {
    const votes = createVotes(makeConfig())
    const to = Keypair.generate().publicKey

    // Should not throw — number gets converted to bigint
    const action = votes.actions.transferFromTreasury({
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
  test('passes correct voteType to castVote', async () => {
    const config = makeConfig()
    const votes = createVotes(config)
    const proposal = Keypair.generate().publicKey

    // castVote will throw "No voting power" since mock returns 0.
    // That's expected — we test the wiring.
    try {
      await votes.vote(proposal, 'for')
    } catch (e: any) {
      expect(e.message).toMatch(/voting power/i)
    }
  })

  test('accepts all three vote types', () => {
    const votes = createVotes(makeConfig())
    const proposal = Keypair.generate().publicKey

    // Verify all three types are accepted (they'll throw due to mock)
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
  test('delegates with specific amount', async () => {
    const votes = createVotes(makeConfig())
    const dao = Keypair.generate().publicKey
    const to = Keypair.generate().publicKey

    const result = await votes.delegate(dao, {
      to,
      amount: 5000n,
    })

    expect(result.delegation).toBeDefined()
    expect(result.delegation.delegate.equals(to)).toBe(true)
    expect(result.delegation.amount).toBe(5000n)
    expect(result.signature).toBeDefined()
  })

  test('handles "all" by passing undefined amount', async () => {
    const votes = createVotes(makeConfig())
    const dao = Keypair.generate().publicKey
    const to = Keypair.generate().publicKey

    const result = await votes.delegate(dao, {
      to,
      amount: 'all',
    })

    // When amount='all', underlying delegateVotingPower receives undefined → 0n (means all)
    expect(result.delegation.amount).toBe(0n)
  })

  test('parses expires duration string', async () => {
    const votes = createVotes(makeConfig())
    const dao = Keypair.generate().publicKey
    const to = Keypair.generate().publicKey

    const result = await votes.delegate(dao, {
      to,
      amount: 1000n,
      expires: '30 days',
    })

    // 30 days = 2592000 seconds
    expect(result.delegation.expiresAt).toBe(2592000n)
  })

  test('accepts bigint expires directly', async () => {
    const votes = createVotes(makeConfig())
    const dao = Keypair.generate().publicKey
    const to = Keypair.generate().publicKey

    const result = await votes.delegate(dao, {
      to,
      amount: 1000n,
      expires: 86400n,
    })

    expect(result.delegation.expiresAt).toBe(86400n)
  })
})

// ---------------------------------------------------------------------------
// votes.votingPower
// ---------------------------------------------------------------------------

describe('votes.votingPower', () => {
  test('returns { own, delegated, total } shape', async () => {
    const config = makeConfig()
    const votes = createVotes(config)
    const dao = makeDAO()

    const power = await votes.votingPower(dao)

    expect(power).toHaveProperty('own')
    expect(power).toHaveProperty('delegated')
    expect(power).toHaveProperty('total')
    expect(typeof power.own).toBe('bigint')
    expect(typeof power.delegated).toBe('bigint')
    expect(typeof power.total).toBe('bigint')
  })

  test('total equals own + delegated', async () => {
    const votes = createVotes(makeConfig())
    const dao = makeDAO()

    const power = await votes.votingPower(dao)

    expect(power.total).toBe(power.own + power.delegated)
  })

  test('uses wallet.publicKey when no voter specified', async () => {
    const config = makeConfig()
    const votes = createVotes(config)
    const dao = makeDAO()

    // Should not throw
    const power = await votes.votingPower(dao)
    expect(power).toBeDefined()
  })

  test('accepts explicit voter PublicKey', async () => {
    const config = makeConfig()
    const votes = createVotes(config)
    const dao = makeDAO()
    const voter = Keypair.generate().publicKey

    const power = await votes.votingPower(dao, voter)
    expect(power).toBeDefined()
  })

  test('returns zeros when DAO not found on chain', async () => {
    const config = makeConfig()
    const votes = createVotes(config)
    const daoAddress = Keypair.generate().publicKey

    // getDAO returns null for PublicKey (mock returns null from getAccountInfo)
    const power = await votes.votingPower(daoAddress)
    expect(power.own).toBe(0n)
    expect(power.delegated).toBe(0n)
    expect(power.total).toBe(0n)
  })
})

// ---------------------------------------------------------------------------
// votes.undelegate
// ---------------------------------------------------------------------------

describe('votes.undelegate', () => {
  test('returns a signature', async () => {
    const votes = createVotes(makeConfig())
    const dao = Keypair.generate().publicKey

    const result = await votes.undelegate(dao)

    expect(result.signature).toBeDefined()
    expect(typeof result.signature).toBe('string')
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
    const recipient = Keypair.generate().publicKey

    const action = votes.actions.mintTokens(mint, recipient, 1000n)
    expect(action.accounts.length).toBe(2)
    expect(action.accounts[0].pubkey.equals(mint)).toBe(true)
    expect(action.accounts[1].pubkey.equals(recipient)).toBe(true)
  })

  test('burnTokens creates a ProposalAction', () => {
    const votes = createVotes(makeConfig())
    const mint = Keypair.generate().publicKey

    const action = votes.actions.burnTokens(mint, 500n)
    expect(action.accounts.length).toBe(1)
    expect(action.accounts[0].pubkey.equals(mint)).toBe(true)
  })
})
