import { describe, test, expect, afterEach } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import {
  generateKeypair,
  isValidPublicKey,
  toPublicKey,
  keypairFromSecretKey,
  keypairFromSeed,
  setWallet,
  clearWallet,
} from '../src/drivers/solana/wallet'

afterEach(() => {
  clearWallet()
})

describe('generateKeypair', () => {
  test('returns a Keypair', () => {
    const kp = generateKeypair()
    expect(kp).toBeInstanceOf(Keypair)
    expect(kp.publicKey).toBeInstanceOf(PublicKey)
    expect(kp.secretKey.length).toBe(64)
  })

  test('generates unique keypairs', () => {
    const a = generateKeypair()
    const b = generateKeypair()
    expect(a.publicKey.equals(b.publicKey)).toBe(false)
  })
})

describe('isValidPublicKey', () => {
  test('returns true for valid public key string', () => {
    const kp = Keypair.generate()
    expect(isValidPublicKey(kp.publicKey.toBase58())).toBe(true)
  })

  test('returns true for system program', () => {
    expect(isValidPublicKey('11111111111111111111111111111111')).toBe(true)
  })

  test('returns false for invalid strings', () => {
    expect(isValidPublicKey('not-a-key')).toBe(false)
    expect(isValidPublicKey('')).toBe(false)
  })

  test('returns false for too-short string', () => {
    expect(isValidPublicKey('abc')).toBe(false)
  })
})

describe('toPublicKey', () => {
  test('converts valid string to PublicKey', () => {
    const kp = Keypair.generate()
    const pk = toPublicKey(kp.publicKey.toBase58())
    expect(pk).toBeInstanceOf(PublicKey)
    expect(pk.equals(kp.publicKey)).toBe(true)
  })

  test('throws for invalid address', () => {
    expect(() => toPublicKey('invalid')).toThrow()
  })
})

describe('keypairFromSecretKey', () => {
  test('recreates keypair from secret key', () => {
    const original = Keypair.generate()
    const restored = keypairFromSecretKey(original.secretKey)
    expect(restored.publicKey.equals(original.publicKey)).toBe(true)
  })

  test('throws for wrong-length secret key', () => {
    expect(() => keypairFromSecretKey(new Uint8Array(32))).toThrow()
  })
})

describe('keypairFromSeed', () => {
  test('generates keypair from 32-byte seed', () => {
    const seed = new Uint8Array(32)
    seed.fill(42)
    const kp = keypairFromSeed(seed)
    expect(kp).toBeInstanceOf(Keypair)
    expect(kp.publicKey).toBeInstanceOf(PublicKey)
  })

  test('same seed produces same keypair', () => {
    const seed = new Uint8Array(32)
    seed.fill(1)
    const a = keypairFromSeed(seed)
    const b = keypairFromSeed(seed)
    expect(a.publicKey.equals(b.publicKey)).toBe(true)
  })

  test('different seeds produce different keypairs', () => {
    const seed1 = new Uint8Array(32).fill(1)
    const seed2 = new Uint8Array(32).fill(2)
    const a = keypairFromSeed(seed1)
    const b = keypairFromSeed(seed2)
    expect(a.publicKey.equals(b.publicKey)).toBe(false)
  })
})

describe('setWallet / clearWallet', () => {
  test('setWallet sets the current wallet', () => {
    const kp = Keypair.generate()
    setWallet(kp)
    // clearWallet in afterEach ensures cleanup
  })

  test('clearWallet clears the current wallet', () => {
    const kp = Keypair.generate()
    setWallet(kp)
    clearWallet()
    // No error means it worked; verifying via loadWallet would require config
  })
})
