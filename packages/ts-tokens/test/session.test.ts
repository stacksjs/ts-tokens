/**
 * Session Tests
 *
 * Tests for session-based signing (start/end, expiry,
 * secret key zeroing, idempotent end).
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { encryptAndSaveKeypair } from '../src/security/keyring'
import {
  startSession,
  getSessionKeypair,
  isSessionActive,
  endSession,
} from '../src/security/session'

let tmpDir: string
let testKeypair: Keypair
const PASSWORD = 'session-test-pw'

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-test-'))
  testKeypair = Keypair.generate()
  encryptAndSaveKeypair(
    testKeypair.secretKey,
    testKeypair.publicKey.toBase58(),
    PASSWORD,
    { keyringDir: tmpDir }
  )
})

afterEach(() => {
  endSession()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function sessionOpts(timeoutMs?: number) {
  return { keyringDir: tmpDir, timeoutMs }
}

describe('startSession / getSessionKeypair', () => {
  test('session returns correct keypair after start', () => {
    startSession(PASSWORD, sessionOpts())

    const kp = getSessionKeypair()
    expect(kp).not.toBeNull()
    expect(kp!.publicKey.equals(testKeypair.publicKey)).toBe(true)
  })

  test('isSessionActive returns true when session is active', () => {
    startSession(PASSWORD, sessionOpts())
    expect(isSessionActive()).toBe(true)
  })

  test('wrong password throws during startSession', () => {
    expect(() => startSession('wrong-password', sessionOpts())).toThrow('Decryption failed')
    expect(isSessionActive()).toBe(false)
  })
})

describe('endSession', () => {
  test('ends the session and getSessionKeypair returns null', () => {
    startSession(PASSWORD, sessionOpts())
    expect(getSessionKeypair()).not.toBeNull()

    endSession()
    expect(getSessionKeypair()).toBeNull()
    expect(isSessionActive()).toBe(false)
  })

  test('zeroes out the decrypted secret key material on end', () => {
    // Capture the live keypair BEFORE ending the session, then verify the
    // actual secret key bytes are overwritten in place (not just that the
    // session reference is dropped).
    startSession(PASSWORD, sessionOpts())
    const kp = getSessionKeypair()
    expect(kp).not.toBeNull()
    const originalSecret = Uint8Array.from(kp!.secretKey)
    expect(originalSecret.some(b => b !== 0)).toBe(true)

    endSession()

    // The keypair's own secretKey array must be zeroed in place
    expect(kp!.secretKey.every(b => b === 0)).toBe(true)
    // And the session is cleared
    expect(getSessionKeypair()).toBeNull()
    expect(isSessionActive()).toBe(false)
  })

  test('idempotent: calling endSession twice does not throw', () => {
    startSession(PASSWORD, sessionOpts())
    endSession()
    expect(() => endSession()).not.toThrow()
    expect(isSessionActive()).toBe(false)
  })

  test('endSession without ever starting does not throw', () => {
    expect(() => endSession()).not.toThrow()
  })
})

describe('session expiry', () => {
  test('session expires after timeout and returns null', () => {
    // Use a very short timeout (1ms)
    startSession(PASSWORD, sessionOpts(1))

    // Wait a bit for the timeout to pass
    const start = Date.now()
    while (Date.now() - start < 10) {
      // busy wait
    }

    expect(getSessionKeypair()).toBeNull()
    expect(isSessionActive()).toBe(false)
  })

  test('starting a new session replaces the old one', () => {
    const kp2 = Keypair.generate()
    const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'session-test2-'))
    encryptAndSaveKeypair(kp2.secretKey, kp2.publicKey.toBase58(), 'pw2', { keyringDir: tmpDir2 })

    startSession(PASSWORD, sessionOpts())
    const first = getSessionKeypair()
    expect(first!.publicKey.equals(testKeypair.publicKey)).toBe(true)

    startSession('pw2', { keyringDir: tmpDir2 })
    const second = getSessionKeypair()
    expect(second!.publicKey.equals(kp2.publicKey)).toBe(true)

    endSession()
    fs.rmSync(tmpDir2, { recursive: true, force: true })
  })
})
