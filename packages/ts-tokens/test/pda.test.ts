import { describe, test, expect } from 'bun:test'
import { PublicKey, Keypair } from '@solana/web3.js'
import {
  findMetadataPda,
  findMasterEditionPda,
  findEditionPda,
  findEditionMarkerPda,
  findCollectionAuthorityPda,
  findUseAuthorityPda,
  findTokenRecordPda,
} from '../src/programs/token-metadata/pda'

const mint1 = Keypair.generate().publicKey
const mint2 = Keypair.generate().publicKey
const authority1 = Keypair.generate().publicKey
const authority2 = Keypair.generate().publicKey

describe('findMetadataPda', () => {
  test('returns a PublicKey and bump', () => {
    const [pda, bump] = findMetadataPda(mint1)
    expect(pda).toBeInstanceOf(PublicKey)
    expect(typeof bump).toBe('number')
    expect(bump).toBeGreaterThanOrEqual(0)
    expect(bump).toBeLessThanOrEqual(255)
  })

  test('is deterministic', () => {
    const [a] = findMetadataPda(mint1)
    const [b] = findMetadataPda(mint1)
    expect(a.equals(b)).toBe(true)
  })

  test('different mints produce different PDAs', () => {
    const [a] = findMetadataPda(mint1)
    const [b] = findMetadataPda(mint2)
    expect(a.equals(b)).toBe(false)
  })
})

describe('findMasterEditionPda', () => {
  test('returns a PublicKey and bump', () => {
    const [pda, bump] = findMasterEditionPda(mint1)
    expect(pda).toBeInstanceOf(PublicKey)
    expect(bump).toBeGreaterThanOrEqual(0)
  })

  test('is deterministic', () => {
    const [a] = findMasterEditionPda(mint1)
    const [b] = findMasterEditionPda(mint1)
    expect(a.equals(b)).toBe(true)
  })

  test('differs from metadata PDA for same mint', () => {
    const [metadata] = findMetadataPda(mint1)
    const [masterEdition] = findMasterEditionPda(mint1)
    expect(metadata.equals(masterEdition)).toBe(false)
  })
})

describe('findEditionPda', () => {
  test('returns same result as findMasterEditionPda', () => {
    const [edition] = findEditionPda(mint1)
    const [master] = findMasterEditionPda(mint1)
    expect(edition.equals(master)).toBe(true)
  })
})

describe('findEditionMarkerPda', () => {
  test('returns a valid PDA', () => {
    const [pda, bump] = findEditionMarkerPda(mint1, 1n)
    expect(pda).toBeInstanceOf(PublicKey)
    expect(bump).toBeGreaterThanOrEqual(0)
  })

  test('different editions produce different PDAs', () => {
    const [a] = findEditionMarkerPda(mint1, 0n)
    const [b] = findEditionMarkerPda(mint1, 248n) // crosses edition boundary
    expect(a.equals(b)).toBe(false)
  })

  test('same edition number within same marker group returns same PDA', () => {
    // Editions 0 and 247 are in the same marker (both / 248 = 0)
    const [a] = findEditionMarkerPda(mint1, 0n)
    const [b] = findEditionMarkerPda(mint1, 247n)
    expect(a.equals(b)).toBe(true)
  })
})

describe('findCollectionAuthorityPda', () => {
  test('returns a valid PDA', () => {
    const [pda, bump] = findCollectionAuthorityPda(mint1, authority1)
    expect(pda).toBeInstanceOf(PublicKey)
    expect(bump).toBeGreaterThanOrEqual(0)
  })

  test('different authorities produce different PDAs', () => {
    const [a] = findCollectionAuthorityPda(mint1, authority1)
    const [b] = findCollectionAuthorityPda(mint1, authority2)
    expect(a.equals(b)).toBe(false)
  })
})

describe('findUseAuthorityPda', () => {
  test('returns a valid PDA', () => {
    const [pda, bump] = findUseAuthorityPda(mint1, authority1)
    expect(pda).toBeInstanceOf(PublicKey)
    expect(bump).toBeGreaterThanOrEqual(0)
  })

  test('different from collection authority PDA with same inputs', () => {
    const [usePda] = findUseAuthorityPda(mint1, authority1)
    const [collPda] = findCollectionAuthorityPda(mint1, authority1)
    expect(usePda.equals(collPda)).toBe(false)
  })
})

describe('findTokenRecordPda', () => {
  test('returns a valid PDA', () => {
    const token = Keypair.generate().publicKey
    const [pda, bump] = findTokenRecordPda(mint1, token)
    expect(pda).toBeInstanceOf(PublicKey)
    expect(bump).toBeGreaterThanOrEqual(0)
  })

  test('different tokens produce different PDAs', () => {
    const token1 = Keypair.generate().publicKey
    const token2 = Keypair.generate().publicKey
    const [a] = findTokenRecordPda(mint1, token1)
    const [b] = findTokenRecordPda(mint1, token2)
    expect(a.equals(b)).toBe(false)
  })
})
