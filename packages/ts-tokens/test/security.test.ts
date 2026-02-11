/**
 * Security Audit Tests
 *
 * Tests for auditToken, auditCollection, and auditWallet functions
 * in the security/audit module.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import { auditToken, auditCollection, auditWallet } from '../src/security/audit'
import { createMockConnection } from './helpers/mock-connection'

/**
 * Helper: build a mock AccountInfo object with a given data buffer.
 */
function mockAccountInfo(data: Buffer) {
  return {
    data,
    executable: false,
    lamports: 0,
    owner: PublicKey.default,
    rentEpoch: 0,
  }
}

describe('auditToken', () => {
  test('returns critical finding and riskScore 100 when account is null', async () => {
    const conn = createMockConnection({
      getAccountInfo: async () => null,
    })
    const mint = Keypair.generate().publicKey

    const report = await auditToken(conn, mint)

    expect(report.riskScore).toBe(100)
    expect(report.targetType).toBe('token')
    expect(report.target).toBe(mint.toBase58())
    expect(report.findings).toHaveLength(1)
    expect(report.findings[0].severity).toBe('critical')
    expect(report.findings[0].title).toBe('Token not found')
    expect(report.findings[0].category).toBe('existence')
  })

  test('returns medium finding when mint authority is set (byte[0]=1)', async () => {
    const data = Buffer.alloc(100)
    data[0] = 1 // mint authority present

    const conn = createMockConnection({
      getAccountInfo: async () => mockAccountInfo(data),
    })
    const mint = Keypair.generate().publicKey

    const report = await auditToken(conn, mint)

    const mintAuthorityFinding = report.findings.find(f => f.title === 'Mint authority is set')
    expect(mintAuthorityFinding).toBeDefined()
    expect(mintAuthorityFinding!.severity).toBe('medium')
    expect(mintAuthorityFinding!.category).toBe('authority')
    expect(report.riskScore).toBeGreaterThanOrEqual(20)
  })

  test('returns high finding when freeze authority is set (byte[36]=1)', async () => {
    const data = Buffer.alloc(100)
    data[36] = 1 // freeze authority present

    const conn = createMockConnection({
      getAccountInfo: async () => mockAccountInfo(data),
    })
    const mint = Keypair.generate().publicKey

    const report = await auditToken(conn, mint)

    const freezeFinding = report.findings.find(f => f.title === 'Freeze authority is set')
    expect(freezeFinding).toBeDefined()
    expect(freezeFinding!.severity).toBe('high')
    expect(freezeFinding!.category).toBe('authority')
    expect(report.riskScore).toBeGreaterThanOrEqual(30)
  })

  test('returns combined risk when both authorities are set', async () => {
    const data = Buffer.alloc(100)
    data[0] = 1  // mint authority
    data[36] = 1 // freeze authority

    const conn = createMockConnection({
      getAccountInfo: async () => mockAccountInfo(data),
    })
    const mint = Keypair.generate().publicKey

    const report = await auditToken(conn, mint)

    const mintFinding = report.findings.find(f => f.title === 'Mint authority is set')
    const freezeFinding = report.findings.find(f => f.title === 'Freeze authority is set')
    expect(mintFinding).toBeDefined()
    expect(freezeFinding).toBeDefined()
    // 20 (mint) + 30 (freeze) = 50
    expect(report.riskScore).toBe(50)
    expect(report.recommendations).toContain('Revoke mint authority if supply should be fixed')
    expect(report.recommendations).toContain('Revoke freeze authority to prevent account freezing')
  })

  test('includes info finding about supply for valid accounts', async () => {
    const data = Buffer.alloc(100) // no authorities set

    const conn = createMockConnection({
      getAccountInfo: async () => mockAccountInfo(data),
    })
    const mint = Keypair.generate().publicKey

    const report = await auditToken(conn, mint)

    const infoFinding = report.findings.find(f => f.severity === 'info' && f.category === 'supply')
    expect(infoFinding).toBeDefined()
    expect(infoFinding!.title).toBe('Token supply information')
    expect(report.riskScore).toBe(0)
  })
})

describe('auditCollection', () => {
  test('returns critical finding and riskScore 100 when collection is null', async () => {
    const conn = createMockConnection({
      getAccountInfo: async () => null,
    })
    const collectionMint = Keypair.generate().publicKey

    const report = await auditCollection(conn, collectionMint)

    expect(report.riskScore).toBe(100)
    expect(report.targetType).toBe('collection')
    expect(report.target).toBe(collectionMint.toBase58())
    expect(report.findings).toHaveLength(1)
    expect(report.findings[0].severity).toBe('critical')
    expect(report.findings[0].title).toBe('Collection not found')
    expect(report.summary).toBe('Collection not found on chain')
  })

  test('returns info findings and recommendations for valid collection', async () => {
    const data = Buffer.alloc(100)

    const conn = createMockConnection({
      getAccountInfo: async () => mockAccountInfo(data),
    })
    const collectionMint = Keypair.generate().publicKey

    const report = await auditCollection(conn, collectionMint)

    expect(report.riskScore).toBe(0)
    expect(report.targetType).toBe('collection')
    const metadataFinding = report.findings.find(f => f.category === 'metadata')
    expect(metadataFinding).toBeDefined()
    expect(metadataFinding!.severity).toBe('info')
    expect(report.recommendations).toContain('Verify all NFTs in collection are properly verified')
    expect(report.recommendations).toContain('Consider making collection immutable after launch')
  })
})

describe('auditWallet', () => {
  test('returns low risk for default balance (1 SOL) with no token accounts', async () => {
    const conn = createMockConnection({
      getBalance: async () => 1_000_000_000, // 1 SOL
      getParsedTokenAccountsByOwner: async () => ({ value: [] }),
    })
    const wallet = Keypair.generate().publicKey

    const report = await auditWallet(conn, wallet)

    expect(report.targetType).toBe('wallet')
    expect(report.riskScore).toBe(0)
    // Should only have the info summary finding
    const mediumFindings = report.findings.filter(f => f.severity === 'medium')
    expect(mediumFindings).toHaveLength(0)
    const infoFinding = report.findings.find(f => f.category === 'summary')
    expect(infoFinding).toBeDefined()
    expect(infoFinding!.description).toContain('1 SOL')
  })

  test('returns medium finding for large SOL balance (>100 SOL)', async () => {
    const conn = createMockConnection({
      getBalance: async () => 200_000_000_000, // 200 SOL
      getParsedTokenAccountsByOwner: async () => ({ value: [] }),
    })
    const wallet = Keypair.generate().publicKey

    const report = await auditWallet(conn, wallet)

    const balanceFinding = report.findings.find(f => f.title === 'Large SOL balance')
    expect(balanceFinding).toBeDefined()
    expect(balanceFinding!.severity).toBe('medium')
    expect(balanceFinding!.description).toContain('200 SOL')
    expect(balanceFinding!.recommendation).toBe('Consider using cold storage for large amounts')
    expect(report.riskScore).toBeGreaterThanOrEqual(15)
    expect(report.recommendations).toContain('Use hardware wallet or cold storage for large balances')
  })

  test('returns low finding for many token accounts (>50)', async () => {
    const conn = createMockConnection({
      getBalance: async () => 1_000_000_000, // 1 SOL — below large balance threshold
      getParsedTokenAccountsByOwner: async () => ({
        value: new Array(60).fill({}),
      }),
    })
    const wallet = Keypair.generate().publicKey

    const report = await auditWallet(conn, wallet)

    const accountsFinding = report.findings.find(f => f.title === 'Many token accounts')
    expect(accountsFinding).toBeDefined()
    expect(accountsFinding!.severity).toBe('low')
    expect(accountsFinding!.description).toContain('60')
    expect(accountsFinding!.recommendation).toBe('Consider closing unused token accounts to reclaim rent')
    expect(report.recommendations).toContain('Close unused token accounts to reclaim SOL')
  })
})

describe('Audit report structure and edge cases', () => {
  test('auditToken report includes a timestamp that is a Date', async () => {
    const conn = createMockConnection({
      getAccountInfo: async () => null,
    })
    const mint = Keypair.generate().publicKey

    const report = await auditToken(conn, mint)

    expect(report.timestamp).toBeInstanceOf(Date)
    // Timestamp should be recent (within the last 5 seconds)
    const now = Date.now()
    expect(now - report.timestamp.getTime()).toBeLessThan(5000)
  })

  test('auditToken summary string for null account contains "not found"', async () => {
    const conn = createMockConnection({
      getAccountInfo: async () => null,
    })
    const mint = Keypair.generate().publicKey

    const report = await auditToken(conn, mint)

    expect(report.summary).toBe('Token not found on chain')
    expect(report.recommendations).toContain('Verify the mint address is correct')
  })

  test('auditToken summary reflects severity for medium-only findings', async () => {
    const data = Buffer.alloc(100)
    data[0] = 1 // only mint authority

    const conn = createMockConnection({
      getAccountInfo: async () => mockAccountInfo(data),
    })
    const mint = Keypair.generate().publicKey

    const report = await auditToken(conn, mint)

    // generateSummary: no critical, no high, medium > 0
    expect(report.summary).toContain('Medium severity issues found')
    expect(report.summary).toContain('Consider addressing')
  })
})
