/**
 * Session-Based Signing
 *
 * Decrypts the keyring once, holds the keypair in memory with
 * automatic expiry and secure cleanup on exit.
 */

import { Keypair } from '@solana/web3.js'
import { loadEncryptedKeypair } from './keyring'
import type { KeyringOptions } from './keyring'

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export interface SessionOptions extends KeyringOptions {
  timeoutMs?: number
}

interface Session {
  keypair: Keypair
  secretKeyRef: Uint8Array
  expiresAt: number
  timer: ReturnType<typeof setTimeout>
}

let activeSession: Session | null = null
let cleanupRegistered = false

function registerCleanupHandlers(): void {
  if (cleanupRegistered) return
  cleanupRegistered = true

  const cleanup = () => {
    endSession()
  }

  process.on('exit', cleanup)
  process.on('SIGINT', () => {
    cleanup()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    cleanup()
    process.exit(143)
  })
}

/**
 * Start a signing session by decrypting the keyring
 */
export function startSession(
  password: string,
  options?: SessionOptions
): void {
  // End any existing session first
  if (activeSession) {
    endSession()
  }

  const secretKey = loadEncryptedKeypair(password, options)
  const keypair = Keypair.fromSecretKey(secretKey)
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const timer = setTimeout(() => {
    endSession()
  }, timeoutMs)

  // Prevent the timer from keeping the process alive
  if (timer.unref) {
    timer.unref()
  }

  activeSession = {
    keypair,
    secretKeyRef: secretKey,
    expiresAt: Date.now() + timeoutMs,
    timer,
  }

  registerCleanupHandlers()
}

/**
 * Get the session keypair, or null if no session is active / session has expired
 */
export function getSessionKeypair(): Keypair | null {
  if (!activeSession) return null

  if (Date.now() >= activeSession.expiresAt) {
    endSession()
    return null
  }

  return activeSession.keypair
}

/**
 * Check if a session is currently active
 */
export function isSessionActive(): boolean {
  if (!activeSession) return false

  if (Date.now() >= activeSession.expiresAt) {
    endSession()
    return false
  }

  return true
}

/**
 * End the session and zero out the secret key bytes
 */
export function endSession(): void {
  if (!activeSession) return

  // Zero out the secret key bytes
  activeSession.secretKeyRef.fill(0)

  clearTimeout(activeSession.timer)
  activeSession = null
}
