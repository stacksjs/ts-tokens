/**
 * API Key Management
 *
 * Secure encrypted storage for API keys using AES-256-GCM.
 */

import * as crypto from 'node:crypto'
import * as fs from 'node:fs'

const ALGORITHM = 'aes-256-gcm'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 32
const IV_LENGTH = 16

/**
 * Stored API key entry
 */
interface StoredKey {
  name: string
  encryptedValue: string
  salt: string
  iv: string
  tag: string
  createdAt: string
  rotateAfter?: string
}

/**
 * API key info (without the actual key value)
 */
export interface APIKeyInfo {
  name: string
  createdAt: Date
  rotateAfter?: Date
  needsRotation: boolean
}

/**
 * Secure API key manager with AES-256-GCM encrypted storage
 */
export class SecureAPIKeyManager {
  private keys: Map<string, StoredKey> = new Map()
  private masterPassword: string

  constructor(masterPassword: string) {
    this.masterPassword = masterPassword
  }

  private encrypt(value: string): { encrypted: string; salt: string; iv: string; tag: string } {
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)
    const key = crypto.scryptSync(this.masterPassword, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    })

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf-8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return {
      encrypted: encrypted.toString('hex'),
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    }
  }

  private decrypt(stored: StoredKey): string {
    const salt = Buffer.from(stored.salt, 'hex')
    const iv = Buffer.from(stored.iv, 'hex')
    const tag = Buffer.from(stored.tag, 'hex')
    const ciphertext = Buffer.from(stored.encryptedValue, 'hex')
    const key = crypto.scryptSync(this.masterPassword, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    })

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    try {
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8')
    } catch {
      throw new Error('Decryption failed: wrong password or corrupted key store')
    }
  }

  /**
   * Add or update an API key
   */
  addKey(name: string, value: string, rotateAfterDays?: number): void {
    const { encrypted, salt, iv, tag } = this.encrypt(value)

    const stored: StoredKey = {
      name,
      encryptedValue: encrypted,
      salt,
      iv,
      tag,
      createdAt: new Date().toISOString(),
    }

    if (rotateAfterDays) {
      const rotateDate = new Date()
      rotateDate.setDate(rotateDate.getDate() + rotateAfterDays)
      stored.rotateAfter = rotateDate.toISOString()
    }

    this.keys.set(name, stored)
  }

  /**
   * Get a decrypted API key
   */
  getKey(name: string): string {
    const stored = this.keys.get(name)
    if (!stored) throw new Error(`API key not found: ${name}`)
    return this.decrypt(stored)
  }

  /**
   * Check if a key needs rotation
   */
  checkRotation(name: string): { needsRotation: boolean; daysUntilRotation?: number } {
    const stored = this.keys.get(name)
    if (!stored) throw new Error(`API key not found: ${name}`)

    if (!stored.rotateAfter) {
      return { needsRotation: false }
    }

    const rotateDate = new Date(stored.rotateAfter)
    const now = new Date()
    const daysUntil = Math.ceil((rotateDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

    return {
      needsRotation: daysUntil <= 0,
      daysUntilRotation: Math.max(0, daysUntil),
    }
  }

  /**
   * Delete an API key
   */
  deleteKey(name: string): boolean {
    return this.keys.delete(name)
  }

  /**
   * List all stored key names and metadata
   */
  listKeys(): APIKeyInfo[] {
    const now = new Date()
    return Array.from(this.keys.values()).map(stored => {
      const rotateAfter = stored.rotateAfter ? new Date(stored.rotateAfter) : undefined
      return {
        name: stored.name,
        createdAt: new Date(stored.createdAt),
        rotateAfter,
        needsRotation: rotateAfter ? rotateAfter <= now : false,
      }
    })
  }

  /**
   * Persist encrypted keys to disk
   */
  persist(filePath: string): void {
    const data = Object.fromEntries(this.keys)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 })
  }

  /**
   * Load encrypted keys from disk
   */
  static load(filePath: string, masterPassword: string): SecureAPIKeyManager {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Key store file not found: ${filePath}`)
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content) as Record<string, StoredKey>

    const manager = new SecureAPIKeyManager(masterPassword)
    for (const [name, stored] of Object.entries(data)) {
      manager.keys.set(name, stored)
    }

    return manager
  }
}
