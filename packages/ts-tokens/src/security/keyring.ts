/**
 * Encrypted Keypair Storage (Keyring)
 *
 * Provides AES-256-GCM encryption with scrypt key derivation for
 * securely storing Solana keypairs on disk.
 */

import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

const KEYRING_VERSION = 1
const ALGORITHM = 'aes-256-gcm'
const KDF = 'scrypt'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 32
const IV_LENGTH = 16

export interface KeyringOptions {
  keyringDir?: string
  keyringFile?: string
}

export interface KeyringInfo {
  version: number
  algorithm: string
  kdf: string
  publicKey: string
}

interface KeyringData {
  version: number
  algorithm: string
  kdf: string
  salt: string
  iv: string
  tag: string
  ciphertext: string
  publicKey: string
}

function getKeyringPath(options?: KeyringOptions): string {
  const dir = options?.keyringDir ?? path.join(os.homedir(), '.ts-tokens')
  const file = options?.keyringFile ?? 'keyring.enc'
  return path.join(dir, file)
}

function ensureKeyringDir(keyringPath: string): void {
  const dir = path.dirname(keyringPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
}

/**
 * Encrypt and save a keypair to the keyring file
 */
export function encryptAndSaveKeypair(
  secretKey: Uint8Array,
  publicKeyBase58: string,
  password: string,
  options?: KeyringOptions
): void {
  const keyringPath = getKeyringPath(options)
  ensureKeyringDir(keyringPath)

  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = deriveKey(password, salt)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secretKey)),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  const data: KeyringData = {
    version: KEYRING_VERSION,
    algorithm: ALGORITHM,
    kdf: KDF,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    publicKey: publicKeyBase58,
  }

  fs.writeFileSync(keyringPath, JSON.stringify(data, null, 2), { mode: 0o600 })
}

/**
 * Load and decrypt a keypair from the keyring file
 */
export function loadEncryptedKeypair(
  password: string,
  options?: KeyringOptions
): Uint8Array {
  const keyringPath = getKeyringPath(options)

  if (!fs.existsSync(keyringPath)) {
    throw new Error(`Keyring file not found: ${keyringPath}`)
  }

  const content = fs.readFileSync(keyringPath, 'utf-8')
  const data: KeyringData = JSON.parse(content)

  if (data.version !== KEYRING_VERSION) {
    throw new Error(`Unsupported keyring version: ${data.version}`)
  }

  const salt = Buffer.from(data.salt, 'hex')
  const iv = Buffer.from(data.iv, 'hex')
  const tag = Buffer.from(data.tag, 'hex')
  const ciphertext = Buffer.from(data.ciphertext, 'hex')
  const key = deriveKey(password, salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ])
    return new Uint8Array(decrypted)
  } catch {
    throw new Error('Decryption failed: wrong password or corrupted keyring')
  }
}

/**
 * Check if a keyring file exists
 */
export function keyringExists(options?: KeyringOptions): boolean {
  return fs.existsSync(getKeyringPath(options))
}

/**
 * Delete the keyring file
 */
export function deleteKeyring(options?: KeyringOptions): void {
  const keyringPath = getKeyringPath(options)
  if (fs.existsSync(keyringPath)) {
    fs.unlinkSync(keyringPath)
  }
}

/**
 * Get keyring info without decrypting (reads public key and version)
 */
export function getKeyringInfo(options?: KeyringOptions): KeyringInfo {
  const keyringPath = getKeyringPath(options)

  if (!fs.existsSync(keyringPath)) {
    throw new Error(`Keyring file not found: ${keyringPath}`)
  }

  const content = fs.readFileSync(keyringPath, 'utf-8')
  const data: KeyringData = JSON.parse(content)

  return {
    version: data.version,
    algorithm: data.algorithm,
    kdf: data.kdf,
    publicKey: data.publicKey,
  }
}
