import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, MintLayout } from '@solana/spl-token'
import {
  checkUnusualAmount,
  checkTokenSecurity,
  checkCollectionSecurity,
  checkAddressReputation,
  checkAuthority,
} from '../src/security/checks'
import {
  checkTokenRegistry,
  checkKnownScamDatabase,
  checkDrainerPattern,
} from '../src/security/phishing-checks'
import {
  checkKnownVulnerabilities,
  checkIdlAvailable,
} from '../src/security/program-checks'
import { checkTimingRandomization } from '../src/security/mev-protection'
import { createMockConnection } from './helpers/mock-connection'

describe('checkUnusualAmount', () => {
  test('safe when amount is small relative to supply', () => {
    const result = checkUnusualAmount(100n, 10_000n, 6)
    expect(result.safe).toBe(true)
    expect(result.warnings.length).toBe(0)
  })

  test('warns when amount is more than 50% of supply', () => {
    const result = checkUnusualAmount(6_000n, 10_000n, 6)
    expect(result.safe).toBe(false)
    expect(result.warnings.some(w => w.includes('50%'))).toBe(true)
  })

  test('warns when UI amount exceeds 1 billion', () => {
    // With 0 decimals, amount is the UI amount
    const bigAmount = BigInt(2_000_000_000)
    const result = checkUnusualAmount(bigAmount, bigAmount * 10n, 0)
    expect(result.warnings.some(w => w.includes('very large'))).toBe(true)
  })

  test('safe when amount is exactly 50% of supply', () => {
    const result = checkUnusualAmount(5_000n, 10_000n, 6)
    expect(result.safe).toBe(true) // <= 50%, not >50%
  })

  test('handles zero supply gracefully', () => {
    const result = checkUnusualAmount(100n, 0n, 6)
    // totalSupply is 0, so the >50% check is skipped
    expect(result.safe).toBe(true)
  })

  test('returns recommendations when warnings exist', () => {
    const result = checkUnusualAmount(8_000n, 10_000n, 6)
    expect(result.recommendations.length).toBeGreaterThan(0)
  })
})

describe('checkTokenSecurity', () => {
  test('safe with no authorities and immutable', () => {
    const result = checkTokenSecurity({
      mintAuthority: null,
      freezeAuthority: null,
      supply: 1_000_000n,
      decimals: 6,
      isMutable: false,
    })
    expect(result.safe).toBe(true)
    expect(result.warnings.length).toBe(0)
  })

  test('recommends revoking mint authority when set', () => {
    const result = checkTokenSecurity({
      mintAuthority: 'SomeAddress',
      freezeAuthority: null,
      supply: 1_000_000n,
      decimals: 6,
      isMutable: false,
    })
    expect(result.recommendations.some(r => r.includes('mint authority'))).toBe(true)
  })

  test('warns about freeze authority', () => {
    const result = checkTokenSecurity({
      mintAuthority: null,
      freezeAuthority: 'SomeAddress',
      supply: 1_000_000n,
      decimals: 6,
      isMutable: false,
    })
    expect(result.warnings.some(w => w.includes('Freeze authority'))).toBe(true)
  })

  test('warns about mutable metadata', () => {
    const result = checkTokenSecurity({
      mintAuthority: null,
      freezeAuthority: null,
      supply: 1_000_000n,
      decimals: 6,
      isMutable: true,
    })
    expect(result.warnings.some(w => w.includes('mutable'))).toBe(true)
  })

  test('reports all applicable warnings in one pass', () => {
    const result = checkTokenSecurity({
      mintAuthority: 'A',
      freezeAuthority: 'B',
      supply: 1_000_000n,
      decimals: 6,
      isMutable: true,
    })
    expect(result.warnings.some(w => w.includes('Freeze authority'))).toBe(true)
    expect(result.warnings.some(w => w.includes('mutable'))).toBe(true)
    expect(result.recommendations.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Not-checked verdicts — no fabricated SAFE
// ---------------------------------------------------------------------------

describe('not-checked verdicts (no security theater)', () => {
  test('checkAddressReputation reports NOT CHECKED for a valid address', async () => {
    const result = await checkAddressReputation(Keypair.generate().publicKey.toBase58())
    expect(result.safe).toBe(false)
    expect(result.checked).toBe(false)
    expect(result.warnings.some(w => w.includes('NOT CHECKED'))).toBe(true)
  })

  test('checkAddressReputation still flags invalid addresses (a real check)', async () => {
    const result = await checkAddressReputation('not-a-valid-address')
    expect(result.safe).toBe(false)
    expect(result.checked).not.toBe(false)
    expect(result.warnings.some(w => w.includes('Invalid Solana address'))).toBe(true)
  })

  test('checkTokenRegistry reports NOT CHECKED', () => {
    const result = checkTokenRegistry(Keypair.generate().publicKey.toBase58())
    expect(result.safe).toBe(false)
    expect(result.checked).toBe(false)
    expect(result.warnings.some(w => w.includes('NOT CHECKED'))).toBe(true)
  })

  test('checkKnownScamDatabase reports NOT CHECKED', () => {
    const result = checkKnownScamDatabase(Keypair.generate().publicKey.toBase58())
    expect(result.safe).toBe(false)
    expect(result.checked).toBe(false)
    expect(result.warnings.some(w => w.includes('NOT CHECKED'))).toBe(true)
  })

  test('checkKnownVulnerabilities reports NOT CHECKED', () => {
    const result = checkKnownVulnerabilities(Keypair.generate().publicKey.toBase58())
    expect(result.safe).toBe(false)
    expect(result.checked).toBe(false)
    expect(result.warnings.some(w => w.includes('NOT CHECKED'))).toBe(true)
  })

  test('checkIdlAvailable reports NOT CHECKED', () => {
    const result = checkIdlAvailable(Keypair.generate().publicKey.toBase58())
    expect(result.safe).toBe(false)
    expect(result.checked).toBe(false)
    expect(result.warnings.some(w => w.includes('NOT CHECKED'))).toBe(true)
  })

  test('checkTimingRandomization reports NOT CHECKED', () => {
    const result = checkTimingRandomization()
    expect(result.safe).toBe(false)
    expect(result.checked).toBe(false)
    expect(result.warnings.some(w => w.includes('NOT CHECKED'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// checkAuthority — real on-chain verification
// ---------------------------------------------------------------------------

function buildMintData(options: { mintAuthority?: string | null; freezeAuthority?: string | null }): Buffer {
  const data = Buffer.alloc(MintLayout.span)
  MintLayout.encode(
    {
      mintAuthorityOption: options.mintAuthority ? 1 : 0,
      mintAuthority: options.mintAuthority ? new PublicKey(options.mintAuthority) : PublicKey.default,
      supply: 1_000_000n,
      decimals: 6,
      isInitialized: true,
      freezeAuthorityOption: options.freezeAuthority ? 1 : 0,
      freezeAuthority: options.freezeAuthority ? new PublicKey(options.freezeAuthority) : PublicKey.default,
    },
    data
  )
  return data
}

describe('checkAuthority', () => {
  test('safe when the on-chain mint authority matches', async () => {
    const authority = Keypair.generate().publicKey
    const conn = createMockConnection({
      getAccountInfo: async () => ({
        owner: TOKEN_PROGRAM_ID,
        data: buildMintData({ mintAuthority: authority.toBase58() }),
        lamports: 1,
        executable: false,
        rentEpoch: 0,
      }),
    })

    const result = await checkAuthority(conn, Keypair.generate().publicKey, authority, 'mint')
    expect(result.safe).toBe(true)
    expect(result.checked).not.toBe(false)
    expect(result.warnings).toHaveLength(0)
  })

  test('unsafe when the on-chain authority differs', async () => {
    const onChain = Keypair.generate().publicKey
    const expected = Keypair.generate().publicKey
    const conn = createMockConnection({
      getAccountInfo: async () => ({
        owner: TOKEN_PROGRAM_ID,
        data: buildMintData({ mintAuthority: onChain.toBase58() }),
        lamports: 1,
        executable: false,
        rentEpoch: 0,
      }),
    })

    const result = await checkAuthority(conn, Keypair.generate().publicKey, expected, 'mint')
    expect(result.safe).toBe(false)
    expect(result.warnings.some(w => w.includes('mismatch'))).toBe(true)
  })

  test('unsafe when the authority has been revoked', async () => {
    const conn = createMockConnection({
      getAccountInfo: async () => ({
        owner: TOKEN_PROGRAM_ID,
        data: buildMintData({ mintAuthority: null }),
        lamports: 1,
        executable: false,
        rentEpoch: 0,
      }),
    })

    const result = await checkAuthority(conn, Keypair.generate().publicKey, Keypair.generate().publicKey, 'mint')
    expect(result.safe).toBe(false)
    expect(result.warnings.some(w => w.includes('revoked'))).toBe(true)
  })

  test('rejects accounts not owned by a token program', async () => {
    const conn = createMockConnection({
      getAccountInfo: async () => ({
        owner: Keypair.generate().publicKey,
        data: buildMintData({ mintAuthority: Keypair.generate().publicKey.toBase58() }),
        lamports: 1,
        executable: false,
        rentEpoch: 0,
      }),
    })

    const result = await checkAuthority(conn, Keypair.generate().publicKey, Keypair.generate().publicKey, 'mint')
    expect(result.safe).toBe(false)
    expect(result.warnings.some(w => w.includes('not owned by a token program'))).toBe(true)
  })

  test('update authority type is honestly NOT CHECKED', async () => {
    const conn = createMockConnection()
    const result = await checkAuthority(conn, Keypair.generate().publicKey, Keypair.generate().publicKey, 'update')
    expect(result.safe).toBe(false)
    expect(result.checked).toBe(false)
    expect(result.warnings.some(w => w.includes('NOT CHECKED'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// checkDrainerPattern — decodes instruction data
// ---------------------------------------------------------------------------

describe('checkDrainerPattern', () => {
  const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'

  function approveIx(): { programId: string; data: string } {
    // SPL Token approve: discriminator byte 4 + u64 amount, base64-encoded
    const data = Buffer.alloc(9)
    data[0] = 4
    data.writeBigUInt64LE(1000n, 1)
    return { programId: TOKEN_PROGRAM, data: data.toString('base64') }
  }

  test('flags more than two approve instructions (base64 data)', () => {
    const result = checkDrainerPattern([approveIx(), approveIx(), approveIx()])
    expect(result.safe).toBe(false)
    expect(result.warnings.some(w => w.includes('drainer'))).toBe(true)
  })

  test('two or fewer approvals is safe', () => {
    const result = checkDrainerPattern([approveIx(), approveIx()])
    expect(result.safe).toBe(true)
  })

  test('detects hex-encoded approve instructions', () => {
    const data = Buffer.alloc(9)
    data[0] = 4
    const hexIx = { programId: TOKEN_PROGRAM, data: data.toString('hex') }
    const result = checkDrainerPattern([hexIx, hexIx, hexIx])
    expect(result.safe).toBe(false)
  })

  test('flags SetAuthority instructions even in small counts', () => {
    const data = Buffer.alloc(35)
    data[0] = 6 // SPL Token setAuthority
    const result = checkDrainerPattern([{ programId: TOKEN_PROGRAM, data: data.toString('base64') }])
    expect(result.safe).toBe(false)
    expect(result.warnings.some(w => w.includes('SetAuthority'))).toBe(true)
  })

  test('ignores non-token-program instructions and undecodable data', () => {
    const other = { programId: Keypair.generate().publicKey.toBase58(), data: Buffer.from([4, 0, 0]).toString('base64') }
    const undecodable = { programId: TOKEN_PROGRAM, data: '***not-decodable***' }
    const result = checkDrainerPattern([other, undecodable])
    expect(result.safe).toBe(true)
  })
})

describe('checkCollectionSecurity', () => {
  test('safe with low royalty, verified, immutable, correct shares', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'SomeAuthority',
      royaltyBps: 500,
      creatorShares: [100],
      isMutable: false,
      isVerified: true,
    })
    expect(result.safe).toBe(true)
    expect(result.warnings.length).toBe(0)
  })

  test('warns about high royalty (>10%)', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'A',
      royaltyBps: 1500,
      creatorShares: [100],
      isMutable: false,
      isVerified: true,
    })
    expect(result.warnings.some(w => w.includes('High royalty'))).toBe(true)
  })

  test('warns and unsafe when shares do not sum to 100', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'A',
      royaltyBps: 500,
      creatorShares: [50, 30],
      isMutable: false,
      isVerified: true,
    })
    expect(result.safe).toBe(false)
    expect(result.warnings.some(w => w.includes("don't sum"))).toBe(true)
  })

  test('warns about mutable collection', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'A',
      royaltyBps: 500,
      creatorShares: [100],
      isMutable: true,
      isVerified: true,
    })
    expect(result.warnings.some(w => w.includes('mutable'))).toBe(true)
  })

  test('warns about unverified collection', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'A',
      royaltyBps: 500,
      creatorShares: [100],
      isMutable: false,
      isVerified: false,
    })
    expect(result.warnings.some(w => w.includes('not verified'))).toBe(true)
  })

  test('includes recommendations for warnings', () => {
    const result = checkCollectionSecurity({
      updateAuthority: 'A',
      royaltyBps: 500,
      creatorShares: [100],
      isMutable: true,
      isVerified: false,
    })
    expect(result.recommendations.length).toBeGreaterThan(0)
  })
})
