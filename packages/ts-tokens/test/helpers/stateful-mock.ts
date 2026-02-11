/**
 * Stateful Mock Connection
 *
 * Tracks mint accounts, token accounts, and balances across lifecycle steps.
 * Extends the existing createMockConnection() pattern with in-memory state.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey, Keypair } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

/**
 * In-memory mint account state
 */
interface MockMintAccount {
  address: string
  decimals: number
  supply: bigint
  mintAuthority: string | null
  freezeAuthority: string | null
  isInitialized: boolean
  programId: string
}

/**
 * In-memory token account state
 */
interface MockTokenAccount {
  address: string
  mint: string
  owner: string
  amount: bigint
  delegate: string | null
  delegatedAmount: bigint
  isFrozen: boolean
  isNative: boolean
}

/**
 * In-memory transaction record
 */
interface MockTransaction {
  signature: string
  timestamp: number
  status: 'confirmed' | 'finalized' | 'failed'
}

/**
 * Tracked state across the stateful mock
 */
export interface MockState {
  mints: Map<string, MockMintAccount>
  tokenAccounts: Map<string, MockTokenAccount>
  balances: Map<string, number>
  transactions: MockTransaction[]

  /** Add a mint to the mock state */
  addMint(opts: {
    address: PublicKey
    decimals?: number
    supply?: bigint
    mintAuthority?: PublicKey | null
    freezeAuthority?: PublicKey | null
    programId?: PublicKey
  }): void

  /** Add a token account to the mock state */
  addTokenAccount(opts: {
    address: PublicKey
    mint: PublicKey
    owner: PublicKey
    amount?: bigint
  }): void

  /** Set SOL balance for an address */
  setBalance(address: PublicKey, lamports: number): void

  /** Get token balance for an account */
  getTokenBalance(address: string): bigint

  /** Mint tokens (increase supply and account balance) */
  mintTo(mint: string, account: string, amount: bigint): void

  /** Transfer tokens between accounts */
  transfer(from: string, to: string, amount: bigint): void

  /** Burn tokens (decrease supply and account balance) */
  burn(account: string, amount: bigint): void

  /** Set authority on a mint */
  setAuthority(mint: string, authorityType: 'mint' | 'freeze', newAuthority: string | null): void

  /** Reset all state */
  reset(): void
}

function createMockState(): MockState {
  const mints = new Map<string, MockMintAccount>()
  const tokenAccounts = new Map<string, MockTokenAccount>()
  const balances = new Map<string, number>()
  const transactions: MockTransaction[] = []

  return {
    mints,
    tokenAccounts,
    balances,
    transactions,

    addMint(opts) {
      const address = opts.address.toBase58()
      mints.set(address, {
        address,
        decimals: opts.decimals ?? 9,
        supply: opts.supply ?? 0n,
        mintAuthority: opts.mintAuthority === null ? null : (opts.mintAuthority ?? opts.address).toBase58(),
        freezeAuthority: opts.freezeAuthority === null ? null : (opts.freezeAuthority?.toBase58() ?? null),
        isInitialized: true,
        programId: (opts.programId ?? TOKEN_PROGRAM_ID).toBase58(),
      })
    },

    addTokenAccount(opts) {
      const address = opts.address.toBase58()
      tokenAccounts.set(address, {
        address,
        mint: opts.mint.toBase58(),
        owner: opts.owner.toBase58(),
        amount: opts.amount ?? 0n,
        delegate: null,
        delegatedAmount: 0n,
        isFrozen: false,
        isNative: false,
      })
    },

    setBalance(address, lamports) {
      balances.set(address.toBase58(), lamports)
    },

    getTokenBalance(address) {
      return tokenAccounts.get(address)?.amount ?? 0n
    },

    mintTo(mint, account, amount) {
      const m = mints.get(mint)
      if (m) m.supply += amount
      const ta = tokenAccounts.get(account)
      if (ta) ta.amount += amount
    },

    transfer(from, to, amount) {
      const fromAcct = tokenAccounts.get(from)
      const toAcct = tokenAccounts.get(to)
      if (fromAcct && fromAcct.amount >= amount) {
        fromAcct.amount -= amount
      }
      if (toAcct) {
        toAcct.amount += amount
      }
    },

    burn(account, amount) {
      const ta = tokenAccounts.get(account)
      if (ta && ta.amount >= amount) {
        ta.amount -= amount
        const m = mints.get(ta.mint)
        if (m) m.supply -= amount
      }
    },

    setAuthority(mint, authorityType, newAuthority) {
      const m = mints.get(mint)
      if (!m) return
      if (authorityType === 'mint') {
        m.mintAuthority = newAuthority
      } else {
        m.freezeAuthority = newAuthority
      }
    },

    reset() {
      mints.clear()
      tokenAccounts.clear()
      balances.clear()
      transactions.length = 0
    },
  }
}

/**
 * Build a mock mint account info buffer (SPL Token layout)
 */
function buildMintAccountBuffer(mint: MockMintAccount): Buffer {
  const buf = Buffer.alloc(82)
  let offset = 0

  // mintAuthorityOption (4 bytes) + mintAuthority (32 bytes)
  if (mint.mintAuthority) {
    buf.writeUInt32LE(1, offset)
    offset += 4
    new PublicKey(mint.mintAuthority).toBuffer().copy(buf, offset)
    offset += 32
  } else {
    buf.writeUInt32LE(0, offset)
    offset += 4
    offset += 32 // zero bytes
  }

  // supply (u64LE)
  buf.writeBigUInt64LE(mint.supply, offset)
  offset += 8

  // decimals (u8)
  buf.writeUInt8(mint.decimals, offset)
  offset += 1

  // isInitialized (u8)
  buf.writeUInt8(mint.isInitialized ? 1 : 0, offset)
  offset += 1

  // freezeAuthorityOption (4 bytes) + freezeAuthority (32 bytes)
  if (mint.freezeAuthority) {
    buf.writeUInt32LE(1, offset)
    offset += 4
    new PublicKey(mint.freezeAuthority).toBuffer().copy(buf, offset)
  } else {
    buf.writeUInt32LE(0, offset)
  }

  return buf
}

/**
 * Build a mock token account info buffer (SPL Token layout)
 */
function buildTokenAccountBuffer(acct: MockTokenAccount): Buffer {
  const buf = Buffer.alloc(165)
  let offset = 0

  // mint (32 bytes)
  new PublicKey(acct.mint).toBuffer().copy(buf, offset)
  offset += 32

  // owner (32 bytes)
  new PublicKey(acct.owner).toBuffer().copy(buf, offset)
  offset += 32

  // amount (u64LE)
  buf.writeBigUInt64LE(acct.amount, offset)
  offset += 8

  // delegateOption (4 bytes) + delegate (32 bytes)
  if (acct.delegate) {
    buf.writeUInt32LE(1, offset)
    offset += 4
    new PublicKey(acct.delegate).toBuffer().copy(buf, offset)
    offset += 32
  } else {
    buf.writeUInt32LE(0, offset)
    offset += 4
    offset += 32
  }

  // state (u8) - 0=uninitialized, 1=initialized, 2=frozen
  buf.writeUInt8(acct.isFrozen ? 2 : 1, offset)
  offset += 1

  // isNativeOption (4 bytes) + isNative (u64LE)
  buf.writeUInt32LE(acct.isNative ? 1 : 0, offset)
  offset += 4
  offset += 8

  // delegatedAmount (u64LE)
  buf.writeBigUInt64LE(acct.delegatedAmount, offset)
  offset += 8

  // closeAuthorityOption (4 bytes) + closeAuthority (32 bytes)
  buf.writeUInt32LE(0, offset)

  return buf
}

/**
 * Create a stateful mock connection that tracks state across operations.
 */
export function createStatefulMock(overrides: Record<string, unknown> = {}): {
  connection: Connection
  state: MockState
} {
  const state = createMockState()
  let txCounter = 0

  const connection = {
    getBalance: async (pubkey: PublicKey) => {
      return state.balances.get(pubkey.toBase58()) ?? 1_000_000_000
    },

    getLatestBlockhash: async () => ({
      blockhash: 'mock-blockhash-' + Math.random().toString(36).slice(2),
      lastValidBlockHeight: 100,
    }),

    getVersion: async () => ({ 'solana-core': '1.16.0', 'feature-set': 1 }),
    getSlot: async () => 12345,
    getMinimumBalanceForRentExemption: async () => 2039280,

    getAccountInfo: async (pubkey: PublicKey) => {
      const key = pubkey.toBase58()

      // Check mint accounts
      const mint = state.mints.get(key)
      if (mint) {
        return {
          data: buildMintAccountBuffer(mint),
          executable: false,
          lamports: 2039280,
          owner: new PublicKey(mint.programId),
          rentEpoch: 0,
        }
      }

      // Check token accounts
      const tokenAcct = state.tokenAccounts.get(key)
      if (tokenAcct) {
        const mintData = state.mints.get(tokenAcct.mint)
        return {
          data: buildTokenAccountBuffer(tokenAcct),
          executable: false,
          lamports: 2039280,
          owner: new PublicKey(mintData?.programId ?? TOKEN_PROGRAM_ID.toBase58()),
          rentEpoch: 0,
        }
      }

      return null
    },

    getMultipleAccountsInfo: async (pubkeys: PublicKey[]) => {
      const results = []
      for (const pk of pubkeys) {
        const info = await (connection as any).getAccountInfo(pk)
        results.push(info)
      }
      return results
    },

    simulateTransaction: async () => ({
      value: { unitsConsumed: 150000, err: null, logs: [] },
    }),

    getRecentPrioritizationFees: async () => [
      { slot: 1, prioritizationFee: 100 },
      { slot: 2, prioritizationFee: 500 },
    ],

    sendRawTransaction: async () => {
      txCounter++
      const sig = `mock-sig-${txCounter}-${Date.now()}`
      state.transactions.push({
        signature: sig,
        timestamp: Date.now(),
        status: 'confirmed',
      })
      return sig
    },

    confirmTransaction: async () => ({ value: { err: null } }),

    getSignatureStatus: async (sig: string) => {
      const tx = state.transactions.find(t => t.signature === sig)
      return {
        value: {
          confirmationStatus: tx?.status ?? 'confirmed',
          err: null,
        },
      }
    },

    getEstimatedFee: async () => 5000,
    rpcEndpoint: 'https://api.devnet.solana.com',
    commitment: 'confirmed',
    requestAirdrop: async () => 'mock-airdrop-sig',

    ...overrides,
  } as unknown as Connection

  return { connection, state }
}
