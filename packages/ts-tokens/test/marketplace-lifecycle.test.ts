/**
 * Marketplace / Distribution / Vesting Lifecycle Tests
 *
 * Regression tests for the funds-at-risk fixes:
 *  - offer escrow refunds subtract the network fee and throw when unconfirmed
 *  - rejectOffer verifies the caller actually holds the NFT
 *  - local state is never mutated when sendAndConfirmTransaction returns
 *    confirmed: false (listings, escrows, offers, claim links, vesting)
 *  - English auction settlement grace period lets the seller reclaim the NFT
 *    from a griefer top bidder
 *  - recoverExpired actively recovers on-chain assets and reports failures
 *  - vesting cliff dates are computed in UTC
 *  - distribution state saves are atomic
 *
 * No module mocks: the tests patch methods on the pooled Connection instance
 * (keyed by a sentinel RPC URL unique to this file, so no other test file can
 * observe it) and decode the transactions the real driver layer hands to
 * sendRawTransaction.
 */

import { describe, test, expect, beforeEach, afterEach, afterAll } from 'bun:test'
import {
  Keypair,
  Transaction,
  SystemProgram,
} from '@solana/web3.js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

import { createConnection, clearConnectionPool } from '../src/drivers/solana/connection'
import { loadWallet } from '../src/drivers/solana/wallet'
import { cancelOffer, rejectOffer } from '../src/marketplace/offers'
import { listNFT, buyListedNFT } from '../src/marketplace/listing'
import { createEscrow } from '../src/marketplace/escrow'
import { cancelAuction, DEFAULT_SETTLE_GRACE_PERIOD_MS } from '../src/marketplace/auction'
import {
  generateId,
  loadState,
  recoverExpired,
  saveOffer,
  getOffer,
  saveListing,
  getListing,
  saveEscrow,
  getEscrow,
  saveAuction,
  getAuction,
} from '../src/marketplace/store'
import {
  createClaimLink,
  fundClaimLink,
  loadDistributionState,
  saveDistributionState,
} from '../src/distribution/link'
import { createVestingSchedule, fundVestingSchedule } from '../src/vesting/schedule'
import { createTestConfig } from './helpers/mock-connection'
import type { TokenConfig } from '../src/types'
import type { LocalOffer, LocalListing, EscrowRecord, AuctionRecord } from '../src/marketplace/types'

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

/** Sentinel RPC URL — the connection pool key is unique to this test file. */
const SENTINEL_RPC = 'https://mock-rpc.invalid/marketplace-lifecycle'
/** A real 32-byte base58 blockhash so transaction signing works. */
const VALID_BLOCKHASH = Keypair.generate().publicKey.toBase58()
const WALLET_FILE_SECRET = Keypair.generate()

let testDir: string
let testStorePath: string
let config: TokenConfig
/** The wallet loadWallet resolves for `config` (session-aware). */
let activeWallet: Keypair
/** Transactions handed to sendRawTransaction, in order. */
let sentTransactions: Transaction[]
/** When set, confirmTransaction reports this error (sendAndConfirm => confirmed: false). */
let confirmError: string | null

/**
 * Patch the pooled connection's RPC methods. Per-test overrides are applied
 * after the defaults.
 */
function patchConnection(
  overrides: Record<string, (...args: never[]) => unknown> = {},
): void {
  const conn = createConnection(config) as unknown as Record<string, unknown>
  const defaults: Record<string, unknown> = {
    getLatestBlockhash: async () => ({
      blockhash: VALID_BLOCKHASH,
      lastValidBlockHeight: 100,
    }),
    getBalance: async () => 1_000_000,
    getFeeForMessage: async () => ({ context: { slot: 1 }, value: 5000 }),
    getParsedTokenAccountsByOwner: async () => ({ value: [] }),
    getAccountInfo: async () => null,
    getMinimumBalanceForRentExemption: async () => 890_880,
    getTransaction: async () => null,
    sendRawTransaction: async (raw: Uint8Array) => {
      sentTransactions.push(Transaction.from(raw))
      return 'mock-signature'
    },
    confirmTransaction: async () => ({
      context: { slot: 1 },
      value: { err: confirmError },
    }),
  }
  Object.assign(conn, defaults, overrides)
}

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-lifecycle-'))
  testStorePath = path.join(testDir, 'state.json')

  // Deterministic wallet via a temp keypair file; loadWallet resolves it the
  // same way the functions under test do (session keypairs from other test
  // files would win — activeWallet stays consistent either way).
  const walletPath = path.join(testDir, 'wallet.json')
  fs.writeFileSync(walletPath, JSON.stringify([...WALLET_FILE_SECRET.secretKey]))
  config = createTestConfig({
    rpcUrl: SENTINEL_RPC,
    wallet: { keypairPath: walletPath },
  })

  // Fresh pooled instance per test, then patch it.
  clearConnectionPool()
  confirmError = null
  sentTransactions = []
  patchConnection()
  activeWallet = loadWallet(config)
})

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true })
})

afterAll(() => {
  // Never leak a patched pooled connection into other test files.
  clearConnectionPool()
})

// ---------------------------------------------------------------------------
// Record factories (owner/bidder/seller default to the active wallet)
// ---------------------------------------------------------------------------

function makeTestOffer(overrides: Partial<LocalOffer> = {}): LocalOffer {
  return {
    id: generateId('offer'),
    mint: Keypair.generate().publicKey,
    bidder: activeWallet.publicKey,
    price: 500_000_000n,
    currency: 'SOL',
    createdAt: Date.now(),
    status: 'active',
    ...overrides,
  }
}

function makeTestListing(overrides: Partial<LocalListing> = {}): LocalListing {
  return {
    id: generateId('listing'),
    mint: Keypair.generate().publicKey,
    seller: activeWallet.publicKey,
    price: 1_000_000_000n,
    currency: 'SOL',
    sellerTokenAccount: Keypair.generate().publicKey,
    delegated: true,
    createdAt: Date.now(),
    status: 'active',
    ...overrides,
  }
}

function makeTestEscrow(overrides: Partial<EscrowRecord> = {}): EscrowRecord {
  return {
    id: generateId('escrow'),
    mint: Keypair.generate().publicKey,
    seller: activeWallet.publicKey,
    price: 1_000_000_000n,
    currency: 'SOL',
    escrowAccount: Keypair.generate().publicKey,
    escrowTokenAccount: Keypair.generate().publicKey,
    status: 'funded',
    signatures: [],
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeTestAuction(overrides: Partial<AuctionRecord> = {}): AuctionRecord {
  const now = Date.now()
  return {
    id: generateId('auction'),
    mint: Keypair.generate().publicKey,
    seller: activeWallet.publicKey,
    type: 'english',
    status: 'active',
    startPrice: 1_000_000_000n,
    bids: [],
    startTime: now - 86_400_000,
    endTime: now + 86_400_000,
    currency: 'SOL',
    createdAt: now - 86_400_000,
    ...overrides,
  }
}

/** Seed an auction with one bid plus the escrow record cancelAuction needs. */
function seedAuctionWithBid(overrides: Partial<AuctionRecord> = {}): AuctionRecord {
  const escrow = makeTestEscrow()
  saveEscrow(
    escrow,
    Buffer.from(Keypair.generate().secretKey).toString('base64'),
    testStorePath,
  )
  const highestBidder = Keypair.generate().publicKey
  const auction = makeTestAuction({
    escrowId: escrow.id,
    highestBid: 2_000_000_000n,
    highestBidder,
    bids: [{ bidder: highestBidder, amount: 2_000_000_000n, timestamp: Date.now() }],
    ...overrides,
  })
  saveAuction(auction, testStorePath)
  return auction
}

/** Seed a funded offer whose escrow keypair is in the store. */
function seedFundedOffer(): LocalOffer {
  const escrow = Keypair.generate()
  const offer = makeTestOffer({ escrowAccount: escrow.publicKey })
  saveOffer(offer, Buffer.from(escrow.secretKey).toString('base64'), testStorePath)
  return offer
}

/** Extract the lamports from a SystemProgram.transfer instruction. */
function transferLamports(ix: Transaction['instructions'][number]): bigint {
  expect(ix.programId.toBase58()).toBe(SystemProgram.programId.toBase58())
  return ix.data.readBigUInt64LE(4)
}

// ---------------------------------------------------------------------------
// Fix #1 — offer escrow refund subtracts the fee and throws when unconfirmed
// ---------------------------------------------------------------------------

describe('offer escrow refund', () => {
  test('refund transfers balance minus the estimated network fee', async () => {
    const offer = seedFundedOffer()

    await cancelOffer(offer.id, config, testStorePath)

    // Exactly one transaction was sent, transferring 1_000_000 - 5_000
    // lamports — not the entire balance (the escrow pays its own fee).
    expect(sentTransactions).toHaveLength(1)
    const [refundTx] = sentTransactions
    expect(refundTx.instructions).toHaveLength(1)
    const ix = refundTx.instructions[0]
    expect(transferLamports(ix)).toBe(995_000n)
    expect(ix.keys[1].pubkey.toBase58()).toBe(offer.bidder.toBase58())

    expect(getOffer(offer.id, testStorePath)!.status).toBe('cancelled')
  })

  test('throws and keeps the offer active when the refund is not confirmed', async () => {
    const offer = seedFundedOffer()
    confirmError = 'insufficient funds for fee'

    await expect(
      cancelOffer(offer.id, config, testStorePath)
    ).rejects.toThrow(/Failed to refund offer escrow: "insufficient funds for fee"/)

    // Status must NOT have flipped — the bidder's SOL is still in escrow.
    expect(getOffer(offer.id, testStorePath)!.status).toBe('active')
  })

  test('falls back to a 5000-lamport fee estimate when the RPC cannot quote fees', async () => {
    const offer = seedFundedOffer()
    patchConnection({
      getBalance: async () => 100_000,
      getFeeForMessage: async () => {
        throw new Error('method not found')
      },
    })

    await cancelOffer(offer.id, config, testStorePath)

    expect(sentTransactions).toHaveLength(1)
    expect(transferLamports(sentTransactions[0].instructions[0])).toBe(95_000n)
  })

  test('rejects when the escrow balance cannot even cover the fee', async () => {
    const offer = seedFundedOffer()
    patchConnection({ getBalance: async () => 4_000 })

    await expect(
      cancelOffer(offer.id, config, testStorePath)
    ).rejects.toThrow(/cannot cover the network fee/)

    expect(sentTransactions).toHaveLength(0)
    expect(getOffer(offer.id, testStorePath)!.status).toBe('active')
  })
})

// ---------------------------------------------------------------------------
// Fix #7 — rejectOffer requires the caller to hold the NFT
// ---------------------------------------------------------------------------

describe('rejectOffer authorization', () => {
  test('rejects when the caller does not hold the NFT', async () => {
    const offer = seedFundedOffer()
    // default patch: getParsedTokenAccountsByOwner -> { value: [] }

    await expect(
      rejectOffer(offer.id, config, testStorePath)
    ).rejects.toThrow(/Only the current holder of the NFT/)

    expect(getOffer(offer.id, testStorePath)!.status).toBe('active')
  })

  test('refunds and marks rejected when the caller holds the NFT', async () => {
    const offer = seedFundedOffer()
    patchConnection({
      getParsedTokenAccountsByOwner: async () => ({
        value: [
          {
            pubkey: Keypair.generate().publicKey,
            account: {
              data: { parsed: { info: { tokenAmount: { amount: '1', decimals: 0 } } } },
            },
          },
        ],
      }),
    })

    await rejectOffer(offer.id, config, testStorePath)

    expect(getOffer(offer.id, testStorePath)!.status).toBe('rejected')
    // Refund actually attempted (fee-adjusted transfer sent)
    expect(sentTransactions).toHaveLength(1)
    expect(transferLamports(sentTransactions[0].instructions[0])).toBe(995_000n)
  })
})

// ---------------------------------------------------------------------------
// Fix #3 — state is never mutated when the transaction is unconfirmed
// ---------------------------------------------------------------------------

describe('state is not mutated when the transaction is unconfirmed', () => {
  test('listNFT throws and saves no listing on failure; saves on success', async () => {
    const mint = Keypair.generate().publicKey

    confirmError = 'blockhash not found'
    await expect(
      listNFT({ mint, price: 1_000_000_000n }, config, testStorePath)
    ).rejects.toThrow(/Failed to approve listing delegate/)
    expect(loadState(testStorePath).listings).toEqual({})

    confirmError = null
    const listing = await listNFT({ mint, price: 1_000_000_000n }, config, testStorePath)
    expect(listing.status).toBe('active')
    expect(getListing(listing.id, testStorePath)!.status).toBe('active')
  })

  test('buyListedNFT keeps the listing active when the buy tx fails', async () => {
    const delegate = Keypair.generate()
    const listing = makeTestListing({ seller: Keypair.generate().publicKey })
    saveListing(
      listing,
      Buffer.from(delegate.secretKey).toString('base64'),
      testStorePath,
    )

    confirmError = 'simulation failed'
    await expect(
      buyListedNFT(listing.mint, config, testStorePath)
    ).rejects.toThrow(/Failed to buy listed NFT/)

    expect(getListing(listing.id, testStorePath)!.status).toBe('active')

    confirmError = null
    await buyListedNFT(listing.mint, config, testStorePath)
    expect(getListing(listing.id, testStorePath)!.status).toBe('sold')
  })

  test('createEscrow throws and saves no escrow on failure; saves on success', async () => {
    const mint = Keypair.generate().publicKey

    confirmError = 'tx dropped'
    await expect(
      createEscrow({ mint, price: 1_000_000_000n }, config, testStorePath)
    ).rejects.toThrow(/Failed to deposit NFT into escrow/)
    expect(loadState(testStorePath).escrows).toEqual({})

    confirmError = null
    const escrow = await createEscrow({ mint, price: 1_000_000_000n }, config, testStorePath)
    expect(escrow.status).toBe('funded')
    expect(getEscrow(escrow.id, testStorePath)!.status).toBe('funded')
  })

  test('fundClaimLink keeps the link pending when the funding tx fails', async () => {
    const link = await createClaimLink({ amount: 100_000n }, config, testStorePath)

    confirmError = 'insufficient funds'
    await expect(
      fundClaimLink(link.id, config, testStorePath)
    ).rejects.toThrow(/Failed to fund claim link/)

    expect(loadDistributionState(testStorePath).links[link.id].status).toBe('pending')

    confirmError = null
    await fundClaimLink(link.id, config, testStorePath)
    expect(loadDistributionState(testStorePath).links[link.id].status).toBe('funded')
  })

  test('fundVestingSchedule does not brick the schedule when the funding tx fails', async () => {
    const schedule = await createVestingSchedule(
      {
        recipient: Keypair.generate().publicKey.toBase58(),
        mint: Keypair.generate().publicKey.toBase58(),
        totalAmount: 1_000_000n,
        cliffMonths: 1,
        vestingMonths: 2,
        startDate: Date.now(),
      },
      config,
      testStorePath,
    )

    confirmError = 'timeout'
    await expect(
      fundVestingSchedule(schedule.id, config, testStorePath)
    ).rejects.toThrow(/Failed to fund vesting schedule/)

    // Crucially the schedule must stay 'pending' with NO escrow secret
    // persisted — an 'active' schedule could never be re-funded.
    let stored = JSON.parse(fs.readFileSync(testStorePath, 'utf-8'))
    expect(stored.schedules[schedule.id].status).toBe('pending')
    expect(stored.schedules[schedule.id].escrowSecret).toBeUndefined()

    // Retry after the failure succeeds.
    confirmError = null
    await fundVestingSchedule(schedule.id, config, testStorePath)
    stored = JSON.parse(fs.readFileSync(testStorePath, 'utf-8'))
    expect(stored.schedules[schedule.id].status).toBe('active')
    expect(stored.schedules[schedule.id].escrowSecret).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Fix #5 — English auction settlement grace period
// ---------------------------------------------------------------------------

describe('auction settlement grace period', () => {
  test('cannot cancel with bids during the default 24h grace period', async () => {
    const auction = seedAuctionWithBid({ endTime: Date.now() - 3_600_000 }) // ended 1h ago

    await expect(
      cancelAuction(auction.id, config, testStorePath)
    ).rejects.toThrow(/grace period/)

    expect(getAuction(auction.id, testStorePath)!.status).toBe('active')
  })

  test('seller can cancel with bids after the grace period — griefer cannot lock the NFT', async () => {
    // ended 24h + 1h ago → default 24h grace has passed
    const auction = seedAuctionWithBid({
      endTime: Date.now() - DEFAULT_SETTLE_GRACE_PERIOD_MS - 3_600_000,
    })

    await cancelAuction(auction.id, config, testStorePath)

    expect(getAuction(auction.id, testStorePath)!.status).toBe('cancelled')
    // NFT-return (transferChecked) + escrow-close instructions were sent
    expect(sentTransactions).toHaveLength(1)
    expect(sentTransactions[0].instructions).toHaveLength(2)
  })

  test('honors a custom settleGracePeriod', async () => {
    const auction = seedAuctionWithBid({
      endTime: Date.now() - 1_000, // ended 1s ago
      settleGracePeriod: 0, // no grace — seller may cancel immediately
    })

    await cancelAuction(auction.id, config, testStorePath)
    expect(getAuction(auction.id, testStorePath)!.status).toBe('cancelled')
  })

  test('does not mutate state when the cancel tx is unconfirmed', async () => {
    const auction = seedAuctionWithBid({
      endTime: Date.now() - DEFAULT_SETTLE_GRACE_PERIOD_MS - 3_600_000,
    })
    confirmError = 'tx expired'

    await expect(
      cancelAuction(auction.id, config, testStorePath)
    ).rejects.toThrow(/Failed to cancel auction/)

    expect(getAuction(auction.id, testStorePath)!.status).toBe('active')
  })
})

// ---------------------------------------------------------------------------
// Fix #4 — recoverExpired actively recovers on-chain assets
// ---------------------------------------------------------------------------

describe('recoverExpired', () => {
  function seedExpiredRecords(): void {
    const past = Date.now() - 1_000

    // Expired funded offer (escrowed SOL refundable) — the escrowAccount must
    // match the stored secret or the real serialize() signature check fails.
    const offerEscrow = Keypair.generate()
    saveOffer(
      makeTestOffer({ escrowAccount: offerEscrow.publicKey, expiry: past }),
      Buffer.from(offerEscrow.secretKey).toString('base64'),
      testStorePath,
    )

    // Expired funded escrow (NFT locked, seller reclaimable)
    saveEscrow(
      makeTestEscrow({ expiry: past }),
      Buffer.from(Keypair.generate().secretKey).toString('base64'),
      testStorePath,
    )

    // Expired active listing (live delegate revocable)
    saveListing(
      makeTestListing({ expiry: past }),
      Buffer.from(Keypair.generate().secretKey).toString('base64'),
      testStorePath,
    )

    // Ended auction (no on-chain action needed)
    saveAuction(makeTestAuction({ endTime: past }), testStorePath)
  }

  test('recovers expired offers, escrows and listings, and ends auctions', async () => {
    seedExpiredRecords()

    const summary = await recoverExpired(config, testStorePath)

    expect(summary.failed).toEqual([])
    expect(summary.recovered).toEqual({ listings: 1, offers: 1, escrows: 1 })
    expect(summary.auctions).toBe(1)

    const state = loadState(testStorePath)
    expect(Object.values(state.offers)[0].status).toBe('expired')
    expect(Object.values(state.escrows)[0].status).toBe('cancelled')
    expect(Object.values(state.listings)[0].status).toBe('cancelled')
    expect(Object.values(state.auctions)[0].status).toBe('ended')
  })

  test('leaves records in their current state and reports failures when recovery fails', async () => {
    seedExpiredRecords()
    confirmError = 'node is behind'

    const summary = await recoverExpired(config, testStorePath)

    expect(summary.recovered).toEqual({ listings: 0, offers: 0, escrows: 0 })
    expect(summary.failed).toHaveLength(3)
    expect(summary.failed.map(f => f.kind).sort()).toEqual(['escrow', 'listing', 'offer'])
    // Auctions still transition — they need no on-chain action.
    expect(summary.auctions).toBe(1)

    // Nothing stranded by a premature status flip: records stay recoverable.
    const state = loadState(testStorePath)
    expect(Object.values(state.offers)[0].status).toBe('active')
    expect(Object.values(state.escrows)[0].status).toBe('funded')
    expect(Object.values(state.listings)[0].status).toBe('active')
    expect(Object.values(state.auctions)[0].status).toBe('ended')
  })
})

// ---------------------------------------------------------------------------
// Fix #11 — vesting cliff dates use UTC calendar math
// ---------------------------------------------------------------------------

describe('vesting UTC date math', () => {
  test('cliff and end dates are computed in UTC (month-end clamped)', async () => {
    const startDate = Date.UTC(2024, 0, 31, 12, 30, 0) // Jan 31 2024, 12:30 UTC

    const schedule = await createVestingSchedule(
      {
        recipient: Keypair.generate().publicKey.toBase58(),
        mint: Keypair.generate().publicKey.toBase58(),
        totalAmount: 1_000_000n,
        cliffMonths: 1,
        vestingMonths: 7,
        startDate,
      },
      config,
      testStorePath,
    )

    // Jan 31 + 1 month clamps to Feb 29 (2024 is a leap year), same UTC time.
    expect(schedule.cliffDate).toBe(Date.UTC(2024, 1, 29, 12, 30, 0))
    // Jan 31 + 8 months clamps to Sep 30 (Sep has 30 days), same UTC time.
    expect(schedule.endDate).toBe(Date.UTC(2024, 8, 30, 12, 30, 0))
    // Timezone-independent: the cliff day in UTC is always the clamped day.
    expect(new Date(schedule.cliffDate).getUTCDate()).toBe(29)
  })
})

// ---------------------------------------------------------------------------
// Fix #6 — distribution state saves are atomic
// ---------------------------------------------------------------------------

describe('distribution state persistence', () => {
  test('saveDistributionState produces valid JSON and leaves no temp files', () => {
    saveDistributionState(
      { links: {}, campaigns: {} },
      testStorePath,
    )
    saveDistributionState(
      { links: { l1: { id: 'l1' } as never }, campaigns: {} },
      testStorePath,
    )

    const loaded = loadDistributionState(testStorePath)
    expect(Object.keys(loaded.links)).toEqual(['l1'])

    const leftovers = fs.readdirSync(testDir).filter(f => f.endsWith('.tmp'))
    expect(leftovers).toEqual([])
  })

  test('loadDistributionState throws a clear error on corrupted JSON', () => {
    fs.writeFileSync(testStorePath, '{ "links": {', 'utf-8')

    expect(() => loadDistributionState(testStorePath)).toThrow(/State file corrupted at/)
  })
})
