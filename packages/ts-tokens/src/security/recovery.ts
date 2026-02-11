/**
 * Key Recovery
 *
 * Shamir secret sharing, social recovery, and hardware wallet recovery flows.
 */

import * as crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 32
const IV_LENGTH = 16

/**
 * A single Shamir share
 */
export interface ShamirShare {
  index: number
  data: Uint8Array
}

/**
 * Guardian configuration for social recovery
 */
export interface Guardian {
  id: string
  name: string
  publicKey: string
  contactInfo?: string
}

/**
 * Social recovery configuration
 */
export interface SocialRecoveryConfig {
  guardians: Guardian[]
  threshold: number
  createdAt: Date
}

/**
 * Recovery request
 */
export interface RecoveryRequest {
  id: string
  requestedAt: Date
  approvals: Set<string>
  threshold: number
  config: SocialRecoveryConfig
}

/**
 * Encrypted share for a guardian
 */
export interface EncryptedGuardianShare {
  guardianId: string
  encryptedData: string
  salt: string
  iv: string
  tag: string
}

/**
 * Hardware wallet recovery step
 */
export interface RecoveryStep {
  step: number
  instruction: string
  warning?: string
}

// GF(256) arithmetic for Shamir secret sharing
const GF256_EXP = new Uint8Array(512)
const GF256_LOG = new Uint8Array(256)

// Initialize GF(256) lookup tables
;(function initGF256() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x
    GF256_LOG[x] = i
    x = x ^ (x << 1)
    if (x & 0x100) x ^= 0x11b
  }
  for (let i = 255; i < 512; i++) {
    GF256_EXP[i] = GF256_EXP[i - 255]
  }
})()

function gf256Mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]]
}

function gf256Div(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(256)')
  if (a === 0) return 0
  return GF256_EXP[(GF256_LOG[a] - GF256_LOG[b] + 255) % 255]
}

/**
 * Split a secret into shares using Shamir's Secret Sharing over GF(256)
 */
export function splitSecret(secret: Uint8Array, threshold: number, totalShares: number): ShamirShare[] {
  if (threshold < 2) throw new Error('Threshold must be at least 2')
  if (totalShares < threshold) throw new Error('Total shares must be >= threshold')
  if (totalShares > 254) throw new Error('Maximum 254 shares supported')

  const shares: ShamirShare[] = []
  for (let i = 0; i < totalShares; i++) {
    shares.push({ index: i + 1, data: new Uint8Array(secret.length) })
  }

  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    // Generate random polynomial coefficients; a[0] = secret byte
    const coefficients = new Uint8Array(threshold)
    coefficients[0] = secret[byteIdx]
    const randomCoeffs = crypto.randomBytes(threshold - 1)
    for (let k = 1; k < threshold; k++) {
      coefficients[k] = randomCoeffs[k - 1]
    }

    // Evaluate polynomial at each share index
    for (let i = 0; i < totalShares; i++) {
      const x = i + 1
      let y = 0
      for (let k = threshold - 1; k >= 0; k--) {
        y = gf256Mul(y, x) ^ coefficients[k]
      }
      shares[i].data[byteIdx] = y
    }
  }

  return shares
}

/**
 * Combine shares to reconstruct the secret using Lagrange interpolation
 */
export function combineShares(shares: ShamirShare[]): Uint8Array {
  if (shares.length < 2) throw new Error('Need at least 2 shares to reconstruct')

  const length = shares[0].data.length
  const result = new Uint8Array(length)

  for (let byteIdx = 0; byteIdx < length; byteIdx++) {
    let value = 0

    for (let i = 0; i < shares.length; i++) {
      let basis = 1

      for (let j = 0; j < shares.length; j++) {
        if (i === j) continue
        const num = shares[j].index
        const den = shares[j].index ^ shares[i].index
        basis = gf256Mul(basis, gf256Div(num, den))
      }

      value ^= gf256Mul(shares[i].data[byteIdx], basis)
    }

    result[byteIdx] = value
  }

  return result
}

/**
 * Encrypt a share for a guardian using AES-256-GCM
 */
export function encryptShareForGuardian(
  share: ShamirShare,
  guardianId: string,
  password: string
): EncryptedGuardianShare {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })

  const plaintext = Buffer.alloc(2 + share.data.length)
  plaintext.writeUInt16BE(share.index, 0)
  plaintext.set(share.data, 2)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    guardianId,
    encryptedData: encrypted.toString('hex'),
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  }
}

/**
 * Decrypt a guardian's encrypted share
 */
export function decryptGuardianShare(
  encryptedShare: EncryptedGuardianShare,
  password: string
): ShamirShare {
  const salt = Buffer.from(encryptedShare.salt, 'hex')
  const iv = Buffer.from(encryptedShare.iv, 'hex')
  const tag = Buffer.from(encryptedShare.tag, 'hex')
  const ciphertext = Buffer.from(encryptedShare.encryptedData, 'hex')
  const key = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    const index = decrypted.readUInt16BE(0)
    const data = new Uint8Array(decrypted.subarray(2))
    return { index, data }
  } catch {
    throw new Error('Decryption failed: wrong password or corrupted share')
  }
}

/**
 * Create a social recovery configuration
 */
export function createSocialRecoveryConfig(
  guardians: Guardian[],
  threshold: number
): SocialRecoveryConfig {
  if (guardians.length < 2) throw new Error('At least 2 guardians are required')
  if (threshold < 2) throw new Error('Threshold must be at least 2')
  if (threshold > guardians.length) throw new Error('Threshold cannot exceed number of guardians')

  const ids = new Set(guardians.map(g => g.id))
  if (ids.size !== guardians.length) throw new Error('Guardian IDs must be unique')

  return {
    guardians,
    threshold,
    createdAt: new Date(),
  }
}

/**
 * Initiate a social recovery request
 */
export function initiateSocialRecovery(config: SocialRecoveryConfig): RecoveryRequest {
  return {
    id: crypto.randomUUID(),
    requestedAt: new Date(),
    approvals: new Set(),
    threshold: config.threshold,
    config,
  }
}

/**
 * Approve a recovery request by a guardian
 */
export function approveRecoveryRequest(request: RecoveryRequest, guardianId: string): boolean {
  const guardian = request.config.guardians.find(g => g.id === guardianId)
  if (!guardian) throw new Error(`Unknown guardian: ${guardianId}`)

  request.approvals.add(guardianId)
  return request.approvals.size >= request.threshold
}

/**
 * Check if a recovery request has met its threshold
 */
export function isRecoveryComplete(request: RecoveryRequest): boolean {
  return request.approvals.size >= request.threshold
}

/**
 * Generate hardware wallet recovery flow instructions
 */
export function generateHardwareWalletRecoveryFlow(walletType: 'ledger' | 'trezor'): RecoveryStep[] {
  if (walletType === 'ledger') {
    return [
      { step: 1, instruction: 'Power on your Ledger device and enter your PIN' },
      { step: 2, instruction: 'Navigate to Settings > Security > Recovery Check' },
      { step: 3, instruction: 'Follow the on-device prompts to verify your recovery phrase', warning: 'Never enter your recovery phrase on a computer' },
      { step: 4, instruction: 'If restoring: Power on new device, select "Restore from recovery phrase"' },
      { step: 5, instruction: 'Enter your 24-word recovery phrase using the device buttons only', warning: 'Ensure no cameras or screen recording software are active' },
      { step: 6, instruction: 'Install the Solana app via Ledger Live' },
      { step: 7, instruction: 'Verify the derived address matches your expected address' },
    ]
  }

  return [
    { step: 1, instruction: 'Power on your Trezor device and connect via USB' },
    { step: 2, instruction: 'Open Trezor Suite and navigate to device settings' },
    { step: 3, instruction: 'If restoring: Select "Recover wallet" during initial setup' },
    { step: 4, instruction: 'Enter your recovery seed using the Trezor on-device input', warning: 'Never type your seed words on the computer keyboard' },
    { step: 5, instruction: 'Set a new PIN for the device' },
    { step: 6, instruction: 'Enable passphrase protection if previously used', warning: 'You must use the same passphrase to access the same accounts' },
    { step: 7, instruction: 'Verify the derived Solana address matches your expected address' },
  ]
}

/**
 * Validate a recovered keypair matches the expected public key
 */
export function validateRecoveredKeypair(
  recoveredSecretKey: Uint8Array,
  expectedPublicKey: string
): { valid: boolean; error?: string } {
  try {
    // Solana keypairs are 64 bytes: 32 bytes secret + 32 bytes public
    if (recoveredSecretKey.length !== 64) {
      return { valid: false, error: `Invalid key length: expected 64 bytes, got ${recoveredSecretKey.length}` }
    }

    // Extract public key from the recovered secret key (last 32 bytes)
    const pubKeyBytes = recoveredSecretKey.slice(32)

    // Encode to base58 using PublicKey constructor
    const { PublicKey } = require('@solana/web3.js')
    const recoveredPubKey = new PublicKey(pubKeyBytes).toBase58()

    if (recoveredPubKey !== expectedPublicKey) {
      return { valid: false, error: 'Recovered public key does not match expected address' }
    }

    return { valid: true }
  } catch (err) {
    return { valid: false, error: `Validation failed: ${(err as Error).message}` }
  }
}
