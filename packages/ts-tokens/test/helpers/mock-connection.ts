/**
 * Test Helpers — Reusable factories for mocking Solana objects
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey, Keypair } from '@solana/web3.js'
import type { TokenConfig } from '../../src/types'

/**
 * Create a mock Connection object for tests needing RPC
 */
export function createMockConnection(overrides: Record<string, unknown> = {}): Connection {
  return {
    getBalance: async () => 1_000_000_000,
    getLatestBlockhash: async () => ({
      blockhash: 'mock-blockhash-' + Math.random().toString(36).slice(2),
      lastValidBlockHeight: 100,
    }),
    getVersion: async () => ({ 'solana-core': '1.16.0', 'feature-set': 1 }),
    getSlot: async () => 12345,
    getMinimumBalanceForRentExemption: async () => 2039280,
    getAccountInfo: async () => null,
    getMultipleAccountsInfo: async () => [],
    simulateTransaction: async () => ({ value: { unitsConsumed: 150000, err: null, logs: [] } }),
    getRecentPrioritizationFees: async () => [
      { slot: 1, prioritizationFee: 100 },
      { slot: 2, prioritizationFee: 500 },
      { slot: 3, prioritizationFee: 1000 },
    ],
    sendRawTransaction: async () => 'mock-signature',
    confirmTransaction: async () => ({ value: { err: null } }),
    getSignatureStatus: async () => ({ value: { confirmationStatus: 'confirmed', err: null } }),
    getEstimatedFee: async () => 5000,
    rpcEndpoint: 'https://api.devnet.solana.com',
    commitment: 'confirmed',
    requestAirdrop: async () => 'mock-airdrop-sig',
    ...overrides,
  } as unknown as Connection
}

/**
 * Create a valid TokenConfig for test use
 */
export function createTestConfig(overrides: Partial<TokenConfig> = {}): TokenConfig {
  return {
    chain: 'solana',
    network: 'devnet',
    commitment: 'confirmed',
    verbose: false,
    dryRun: false,
    ipfsGateway: 'https://ipfs.io',
    arweaveGateway: 'https://arweave.net',
    storageProvider: 'arweave',
    securityChecks: true,
    autoCreateAccounts: true,
    ...overrides,
  }
}

/**
 * Build a metadata buffer matching the on-chain Borsh layout
 */
export function buildMetadataBuffer(opts: {
  name?: string
  symbol?: string
  uri?: string
  sellerFeeBasisPoints?: number
  creators?: Array<{ address: PublicKey; verified: boolean; share: number }>
  collection?: { verified: boolean; key: PublicKey }
  uses?: { useMethod: number; remaining: bigint; total: bigint }
  primarySaleHappened?: boolean
  isMutable?: boolean
  editionNonce?: number | null
  tokenStandard?: number | null
  updateAuthority?: PublicKey
  mint?: PublicKey
}): Buffer {
  const parts: Buffer[] = []

  // Key discriminator = 4 (Metadata)
  parts.push(Buffer.from([4]))

  // Update authority (32 bytes)
  const ua = opts.updateAuthority ?? Keypair.generate().publicKey
  parts.push(ua.toBuffer())

  // Mint (32 bytes)
  const mintKey = opts.mint ?? Keypair.generate().publicKey
  parts.push(mintKey.toBuffer())

  // DataV2: name (length-prefixed)
  const name = opts.name ?? 'Test Token'
  const nameBuf = Buffer.from(name, 'utf8')
  const nameLen = Buffer.alloc(4)
  nameLen.writeUInt32LE(nameBuf.length, 0)
  parts.push(nameLen, nameBuf)

  // DataV2: symbol (length-prefixed)
  const symbol = opts.symbol ?? 'TST'
  const symbolBuf = Buffer.from(symbol, 'utf8')
  const symbolLen = Buffer.alloc(4)
  symbolLen.writeUInt32LE(symbolBuf.length, 0)
  parts.push(symbolLen, symbolBuf)

  // DataV2: uri (length-prefixed)
  const uri = opts.uri ?? 'https://example.com/metadata.json'
  const uriBuf = Buffer.from(uri, 'utf8')
  const uriLen = Buffer.alloc(4)
  uriLen.writeUInt32LE(uriBuf.length, 0)
  parts.push(uriLen, uriBuf)

  // DataV2: sellerFeeBasisPoints (u16)
  const sfbp = Buffer.alloc(2)
  sfbp.writeUInt16LE(opts.sellerFeeBasisPoints ?? 500, 0)
  parts.push(sfbp)

  // DataV2: creators (optional vec)
  if (opts.creators && opts.creators.length > 0) {
    parts.push(Buffer.from([1])) // has creators
    const creatorsLen = Buffer.alloc(4)
    creatorsLen.writeUInt32LE(opts.creators.length, 0)
    parts.push(creatorsLen)
    for (const c of opts.creators) {
      parts.push(c.address.toBuffer())
      parts.push(Buffer.from([c.verified ? 1 : 0]))
      parts.push(Buffer.from([c.share]))
    }
  } else {
    parts.push(Buffer.from([0])) // no creators
  }

  // DataV2: collection (optional)
  if (opts.collection) {
    parts.push(Buffer.from([1]))
    parts.push(Buffer.from([opts.collection.verified ? 1 : 0]))
    parts.push(opts.collection.key.toBuffer())
  } else {
    parts.push(Buffer.from([0]))
  }

  // DataV2: uses (optional)
  if (opts.uses) {
    parts.push(Buffer.from([1]))
    parts.push(Buffer.from([opts.uses.useMethod]))
    const remaining = Buffer.alloc(8)
    remaining.writeBigUInt64LE(opts.uses.remaining, 0)
    parts.push(remaining)
    const total = Buffer.alloc(8)
    total.writeBigUInt64LE(opts.uses.total, 0)
    parts.push(total)
  } else {
    parts.push(Buffer.from([0]))
  }

  // primarySaleHappened
  parts.push(Buffer.from([opts.primarySaleHappened ? 1 : 0]))

  // isMutable
  parts.push(Buffer.from([opts.isMutable !== false ? 1 : 0]))

  // editionNonce (optional)
  if (opts.editionNonce != null) {
    parts.push(Buffer.from([1]))
    parts.push(Buffer.from([opts.editionNonce]))
  } else {
    parts.push(Buffer.from([0]))
  }

  // tokenStandard (optional)
  if (opts.tokenStandard != null) {
    parts.push(Buffer.from([1]))
    parts.push(Buffer.from([opts.tokenStandard]))
  } else {
    parts.push(Buffer.from([0]))
  }

  // collection at metadata level (optional) - same as DataV2 collection for full metadata
  if (opts.collection) {
    parts.push(Buffer.from([1]))
    parts.push(Buffer.from([opts.collection.verified ? 1 : 0]))
    parts.push(opts.collection.key.toBuffer())
  } else {
    parts.push(Buffer.from([0]))
  }

  // uses at metadata level (optional)
  if (opts.uses) {
    parts.push(Buffer.from([1]))
    parts.push(Buffer.from([opts.uses.useMethod]))
    const remaining = Buffer.alloc(8)
    remaining.writeBigUInt64LE(opts.uses.remaining, 0)
    parts.push(remaining)
    const total = Buffer.alloc(8)
    total.writeBigUInt64LE(opts.uses.total, 0)
    parts.push(total)
  } else {
    parts.push(Buffer.from([0]))
  }

  // collectionDetails (optional) — none
  parts.push(Buffer.from([0]))

  // programmableConfig (optional) — none
  parts.push(Buffer.from([0]))

  return Buffer.concat(parts)
}

/**
 * Build a MasterEdition buffer
 */
export function buildMasterEditionBuffer(opts: {
  supply?: bigint
  maxSupply?: bigint | null
}): Buffer {
  const parts: Buffer[] = []

  // Key discriminator = 6
  parts.push(Buffer.from([6]))

  // supply (u64LE)
  const supply = Buffer.alloc(8)
  supply.writeBigUInt64LE(opts.supply ?? 0n, 0)
  parts.push(supply)

  // maxSupply (optional u64LE)
  if (opts.maxSupply != null) {
    parts.push(Buffer.from([1]))
    const ms = Buffer.alloc(8)
    ms.writeBigUInt64LE(opts.maxSupply, 0)
    parts.push(ms)
  } else {
    parts.push(Buffer.from([0]))
  }

  return Buffer.concat(parts)
}

/**
 * Build an Edition buffer
 */
export function buildEditionBuffer(opts: {
  parent?: PublicKey
  edition?: bigint
}): Buffer {
  const parts: Buffer[] = []

  // Key discriminator = 1
  parts.push(Buffer.from([1]))

  // parent (32 bytes)
  const parent = opts.parent ?? Keypair.generate().publicKey
  parts.push(parent.toBuffer())

  // edition (u64LE)
  const edition = Buffer.alloc(8)
  edition.writeBigUInt64LE(opts.edition ?? 1n, 0)
  parts.push(edition)

  return Buffer.concat(parts)
}
