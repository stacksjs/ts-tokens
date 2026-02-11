/**
 * Keyring Tests
 *
 * Tests for encrypted keypair storage (encrypt/decrypt round-trip,
 * wrong password, file existence, keyring info).
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  encryptAndSaveKeypair,
  loadEncryptedKeypair,
  keyringExists,
  deleteKeyring,
  getKeyringInfo,
} from '../src/security/keyring'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keyring-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function opts() {
  return { keyringDir: tmpDir }
}

describe('encryptAndSaveKeypair / loadEncryptedKeypair', () => {
  test('round-trip: encrypt then decrypt returns same secret key', () => {
    const kp = Keypair.generate()
    const password = 'test-password-123'

    encryptAndSaveKeypair(kp.secretKey, kp.publicKey.toBase58(), password, opts())
    const decrypted = loadEncryptedKeypair(password, opts())

    expect(decrypted).toEqual(kp.secretKey)
    expect(decrypted.length).toBe(64)
  })

  test('decrypted key can recreate the same Keypair', () => {
    const kp = Keypair.generate()
    const password = 'my-secret'

    encryptAndSaveKeypair(kp.secretKey, kp.publicKey.toBase58(), password, opts())
    const decrypted = loadEncryptedKeypair(password, opts())
    const restored = Keypair.fromSecretKey(decrypted)

    expect(restored.publicKey.equals(kp.publicKey)).toBe(true)
  })

  test('wrong password throws decryption error', () => {
    const kp = Keypair.generate()
    encryptAndSaveKeypair(kp.secretKey, kp.publicKey.toBase58(), 'correct', opts())

    expect(() => loadEncryptedKeypair('wrong-password', opts())).toThrow(
      'Decryption failed'
    )
  })

  test('loading from non-existent keyring throws', () => {
    expect(() => loadEncryptedKeypair('pw', { keyringDir: '/tmp/nonexistent-dir-xyz' }))
      .toThrow('Keyring file not found')
  })

  test('keyring file has restricted permissions (0o600)', () => {
    const kp = Keypair.generate()
    encryptAndSaveKeypair(kp.secretKey, kp.publicKey.toBase58(), 'pw', opts())

    const keyringPath = path.join(tmpDir, 'keyring.enc')
    const stats = fs.statSync(keyringPath)
    const mode = stats.mode & 0o777
    expect(mode).toBe(0o600)
  })

  test('keyring file contains valid JSON with expected fields', () => {
    const kp = Keypair.generate()
    encryptAndSaveKeypair(kp.secretKey, kp.publicKey.toBase58(), 'pw', opts())

    const keyringPath = path.join(tmpDir, 'keyring.enc')
    const content = JSON.parse(fs.readFileSync(keyringPath, 'utf-8'))

    expect(content.version).toBe(1)
    expect(content.algorithm).toBe('aes-256-gcm')
    expect(content.kdf).toBe('scrypt')
    expect(typeof content.salt).toBe('string')
    expect(typeof content.iv).toBe('string')
    expect(typeof content.tag).toBe('string')
    expect(typeof content.ciphertext).toBe('string')
    expect(content.publicKey).toBe(kp.publicKey.toBase58())
  })

  test('re-encrypting overwrites existing keyring', () => {
    const kp1 = Keypair.generate()
    const kp2 = Keypair.generate()

    encryptAndSaveKeypair(kp1.secretKey, kp1.publicKey.toBase58(), 'pw1', opts())
    encryptAndSaveKeypair(kp2.secretKey, kp2.publicKey.toBase58(), 'pw2', opts())

    const decrypted = loadEncryptedKeypair('pw2', opts())
    expect(decrypted).toEqual(kp2.secretKey)

    // Old password should not work
    expect(() => loadEncryptedKeypair('pw1', opts())).toThrow()
  })
})

describe('keyringExists', () => {
  test('returns false when no keyring file exists', () => {
    expect(keyringExists(opts())).toBe(false)
  })

  test('returns true after saving a keyring', () => {
    const kp = Keypair.generate()
    encryptAndSaveKeypair(kp.secretKey, kp.publicKey.toBase58(), 'pw', opts())
    expect(keyringExists(opts())).toBe(true)
  })
})

describe('deleteKeyring', () => {
  test('removes the keyring file', () => {
    const kp = Keypair.generate()
    encryptAndSaveKeypair(kp.secretKey, kp.publicKey.toBase58(), 'pw', opts())
    expect(keyringExists(opts())).toBe(true)

    deleteKeyring(opts())
    expect(keyringExists(opts())).toBe(false)
  })

  test('does not throw when keyring does not exist', () => {
    expect(() => deleteKeyring(opts())).not.toThrow()
  })
})

describe('getKeyringInfo', () => {
  test('returns public key and version without decrypting', () => {
    const kp = Keypair.generate()
    encryptAndSaveKeypair(kp.secretKey, kp.publicKey.toBase58(), 'pw', opts())

    const info = getKeyringInfo(opts())
    expect(info.publicKey).toBe(kp.publicKey.toBase58())
    expect(info.version).toBe(1)
    expect(info.algorithm).toBe('aes-256-gcm')
    expect(info.kdf).toBe('scrypt')
  })

  test('throws when keyring does not exist', () => {
    expect(() => getKeyringInfo(opts())).toThrow('Keyring file not found')
  })
})
