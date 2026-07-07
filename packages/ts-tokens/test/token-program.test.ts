/**
 * Token Program Detection Tests
 *
 * Verifies resolveTokenProgram / getMintWithProgram / getTokenAccountWithProgram
 * detect the owning program from the account owner (the only reliable method —
 * getMint throws for Token-2022 mints before tlvData can be inspected, and
 * extensionless Token-2022 mints have no tlvData at all).
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  MintLayout,
  AccountLayout,
  AccountState,
} from '@solana/spl-token'
import {
  resolveTokenProgram,
  getMintWithProgram,
  getTokenAccountWithProgram,
} from '../src/token/program'
import { createMockConnection } from './helpers/mock-connection'

function buildMintData(opts: { decimals?: number; supply?: bigint } = {}): Buffer {
  const data = Buffer.alloc(MintLayout.span)
  MintLayout.encode(
    {
      mintAuthorityOption: 1,
      mintAuthority: Keypair.generate().publicKey,
      supply: opts.supply ?? 1_000_000n,
      decimals: opts.decimals ?? 9,
      isInitialized: true,
      freezeAuthorityOption: 0,
      freezeAuthority: PublicKey.default,
    },
    data
  )
  return data
}

function buildTokenAccountData(opts: { mint?: PublicKey; owner?: PublicKey; amount?: bigint } = {}): Buffer {
  const data = Buffer.alloc(AccountLayout.span)
  AccountLayout.encode(
    {
      mint: opts.mint ?? Keypair.generate().publicKey,
      owner: opts.owner ?? Keypair.generate().publicKey,
      amount: opts.amount ?? 100n,
      delegateOption: 0,
      delegate: PublicKey.default,
      state: AccountState.Initialized,
      isNativeOption: 0,
      isNative: 0n,
      delegatedAmount: 0n,
      closeAuthorityOption: 0,
      closeAuthority: PublicKey.default,
    },
    data
  )
  return data
}

function mockConnectionWithAccount(owner: PublicKey, data: Buffer) {
  return createMockConnection({
    getAccountInfo: async () => ({
      owner,
      data,
      lamports: 2_039_280,
      executable: false,
      rentEpoch: 0,
    }),
  })
}

describe('resolveTokenProgram', () => {
  test('returns TOKEN_PROGRAM_ID for classic SPL mints', async () => {
    const connection = mockConnectionWithAccount(TOKEN_PROGRAM_ID, buildMintData())
    const programId = await resolveTokenProgram(connection, Keypair.generate().publicKey)
    expect(programId.equals(TOKEN_PROGRAM_ID)).toBe(true)
  })

  test('returns TOKEN_2022_PROGRAM_ID for Token-2022 mints', async () => {
    const connection = mockConnectionWithAccount(TOKEN_2022_PROGRAM_ID, buildMintData())
    const programId = await resolveTokenProgram(connection, Keypair.generate().publicKey)
    expect(programId.equals(TOKEN_2022_PROGRAM_ID)).toBe(true)
  })

  test('throws a clear error when the account does not exist', async () => {
    const connection = createMockConnection({ getAccountInfo: async () => null })
    const mint = Keypair.generate().publicKey
    expect(resolveTokenProgram(connection, mint)).rejects.toThrow(mint.toBase58())
  })

  test('throws when the account is not owned by a token program', async () => {
    const connection = mockConnectionWithAccount(SystemProgram.programId, Buffer.alloc(0))
    expect(resolveTokenProgram(connection, Keypair.generate().publicKey)).rejects.toThrow(
      'not owned by a token program'
    )
  })
})

describe('getMintWithProgram', () => {
  test('unpacks a classic SPL mint with TOKEN_PROGRAM_ID', async () => {
    const connection = mockConnectionWithAccount(TOKEN_PROGRAM_ID, buildMintData({ decimals: 6, supply: 42n }))
    const { mint, programId } = await getMintWithProgram(connection, Keypair.generate().publicKey)
    expect(programId.equals(TOKEN_PROGRAM_ID)).toBe(true)
    expect(mint.decimals).toBe(6)
    expect(mint.supply).toBe(42n)
  })

  test('unpacks an extensionless Token-2022 mint with TOKEN_2022_PROGRAM_ID', async () => {
    // An extensionless Token-2022 mint has no tlvData, so tlvData-based
    // detection would misclassify it — owner-based detection must not
    const connection = mockConnectionWithAccount(TOKEN_2022_PROGRAM_ID, buildMintData({ decimals: 2 }))
    const { mint, programId } = await getMintWithProgram(connection, Keypair.generate().publicKey)
    expect(programId.equals(TOKEN_2022_PROGRAM_ID)).toBe(true)
    expect(mint.decimals).toBe(2)
  })

  test('throws a clear error when the mint does not exist', async () => {
    const connection = createMockConnection({ getAccountInfo: async () => null })
    const mint = Keypair.generate().publicKey
    expect(getMintWithProgram(connection, mint)).rejects.toThrow('does not exist')
  })

  test('throws when the mint is owned by neither token program', async () => {
    const connection = mockConnectionWithAccount(SystemProgram.programId, buildMintData())
    expect(getMintWithProgram(connection, Keypair.generate().publicKey)).rejects.toThrow(
      'not owned by a token program'
    )
  })
})

describe('getTokenAccountWithProgram', () => {
  test('unpacks a classic SPL token account', async () => {
    const owner = Keypair.generate().publicKey
    const connection = mockConnectionWithAccount(
      TOKEN_PROGRAM_ID,
      buildTokenAccountData({ owner, amount: 7n })
    )
    const { account, programId } = await getTokenAccountWithProgram(connection, Keypair.generate().publicKey)
    expect(programId.equals(TOKEN_PROGRAM_ID)).toBe(true)
    expect(account.owner.equals(owner)).toBe(true)
    expect(account.amount).toBe(7n)
  })

  test('unpacks a Token-2022 token account', async () => {
    const connection = mockConnectionWithAccount(
      TOKEN_2022_PROGRAM_ID,
      buildTokenAccountData({ amount: 9n })
    )
    const { account, programId } = await getTokenAccountWithProgram(connection, Keypair.generate().publicKey)
    expect(programId.equals(TOKEN_2022_PROGRAM_ID)).toBe(true)
    expect(account.amount).toBe(9n)
  })

  test('throws a clear error when the token account does not exist', async () => {
    const connection = createMockConnection({ getAccountInfo: async () => null })
    expect(getTokenAccountWithProgram(connection, Keypair.generate().publicKey)).rejects.toThrow(
      'does not exist'
    )
  })
})
