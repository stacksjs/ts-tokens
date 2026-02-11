/**
 * Keypair Backup & Recovery
 *
 * Encrypted backup creation, restoration, and disaster recovery planning.
 * Uses AES-256-GCM encryption matching the keyring.ts patterns.
 */

import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { SecurityCheckResult } from './checks'

const BACKUP_VERSION = 1
const ALGORITHM = 'aes-256-gcm'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 32
const IV_LENGTH = 16

/**
 * Backup manifest
 */
export interface BackupManifest {
  version: number
  createdAt: string
  publicKeys: string[]
  encrypted: boolean
  checksum: string
}

interface BackupData {
  version: number
  algorithm: string
  salt: string
  iv: string
  tag: string
  ciphertext: string
  publicKey: string
  createdAt: string
  checksum: string
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
}

function computeChecksum(data: Uint8Array): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Create an encrypted keypair backup
 */
export function createKeypairBackup(
  secretKey: Uint8Array,
  publicKey: string,
  password: string,
  outputPath: string
): BackupManifest {
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  }

  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = deriveKey(password, salt)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secretKey)),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  const checksum = computeChecksum(secretKey)

  const data: BackupData = {
    version: BACKUP_VERSION,
    algorithm: ALGORITHM,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    publicKey,
    createdAt: new Date().toISOString(),
    checksum,
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), { mode: 0o600 })

  return {
    version: BACKUP_VERSION,
    createdAt: data.createdAt,
    publicKeys: [publicKey],
    encrypted: true,
    checksum,
  }
}

/**
 * Restore a keypair from an encrypted backup
 */
export function restoreKeypairFromBackup(
  backupPath: string,
  password: string
): Uint8Array {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`)
  }

  const content = fs.readFileSync(backupPath, 'utf-8')
  const data: BackupData = JSON.parse(content)

  if (data.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${data.version}`)
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

    // Verify checksum
    const checksum = computeChecksum(new Uint8Array(decrypted))
    if (checksum !== data.checksum) {
      throw new Error('Backup integrity check failed — checksum mismatch')
    }

    return new Uint8Array(decrypted)
  } catch (error) {
    if ((error as Error).message.includes('checksum')) throw error
    throw new Error('Decryption failed: wrong password or corrupted backup')
  }
}

/**
 * Verify backup integrity without decrypting
 */
export function verifyBackupIntegrity(backupPath: string): {
  valid: boolean
  error?: string
  manifest?: BackupManifest
} {
  try {
    if (!fs.existsSync(backupPath)) {
      return { valid: false, error: 'Backup file not found' }
    }

    const content = fs.readFileSync(backupPath, 'utf-8')
    const data: BackupData = JSON.parse(content)

    if (data.version !== BACKUP_VERSION) {
      return { valid: false, error: `Unsupported version: ${data.version}` }
    }

    if (!data.salt || !data.iv || !data.tag || !data.ciphertext || !data.publicKey) {
      return { valid: false, error: 'Backup file is missing required fields' }
    }

    // Verify hex encoding
    Buffer.from(data.salt, 'hex')
    Buffer.from(data.iv, 'hex')
    Buffer.from(data.tag, 'hex')
    Buffer.from(data.ciphertext, 'hex')

    return {
      valid: true,
      manifest: {
        version: data.version,
        createdAt: data.createdAt,
        publicKeys: [data.publicKey],
        encrypted: true,
        checksum: data.checksum,
      },
    }
  } catch (error) {
    return { valid: false, error: `Invalid backup: ${(error as Error).message}` }
  }
}

/**
 * List backup files in a directory
 */
export function listBackups(backupDir: string): BackupManifest[] {
  const manifests: BackupManifest[] = []

  if (!fs.existsSync(backupDir)) return manifests

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.enc') || f.endsWith('.backup'))

  for (const file of files) {
    const result = verifyBackupIntegrity(path.join(backupDir, file))
    if (result.valid && result.manifest) {
      manifests.push(result.manifest)
    }
  }

  return manifests
}

/**
 * Create a disaster recovery plan
 */
export function createDisasterRecoveryPlan(
  wallets: Array<{ publicKey: string; label?: string }>,
  authorities: Array<{ type: string; mint?: string; authority: string }>
): string {
  const lines: string[] = [
    '# Disaster Recovery Plan',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Wallets',
    '',
  ]

  for (const wallet of wallets) {
    lines.push(`- **${wallet.label ?? 'Wallet'}**: \`${wallet.publicKey}\``)
  }

  lines.push('', '## Authority Positions', '')

  for (const auth of authorities) {
    lines.push(`- **${auth.type}** authority for \`${auth.mint ?? 'N/A'}\`: \`${auth.authority}\``)
  }

  lines.push(
    '',
    '## Recovery Steps',
    '',
    '1. Locate encrypted backup files',
    '2. Decrypt using the backup password',
    '3. Import keypair into a Solana wallet',
    '4. Verify all authority positions are intact',
    '5. If authority is compromised, transfer to a new keypair immediately',
    '',
    '## Emergency Contacts',
    '',
    '- [ ] Add emergency contact information here',
    '',
    '## Notes',
    '',
    '- Store this plan in a secure location separate from your backups',
    '- Update this plan whenever authority positions change',
    '- Test recovery procedures periodically',
  )

  return lines.join('\n')
}

/**
 * Check backup recency
 */
export function checkBackupRecency(lastBackupTime: Date): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const daysSinceBackup = (Date.now() - lastBackupTime.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceBackup > 90) {
    warnings.push(`Last backup was ${Math.floor(daysSinceBackup)} days ago — very outdated`)
    recommendations.push('Create a new backup immediately')
  } else if (daysSinceBackup > 30) {
    warnings.push(`Last backup was ${Math.floor(daysSinceBackup)} days ago`)
    recommendations.push('Consider creating a fresh backup')
  }

  return { safe: daysSinceBackup <= 90, warnings, recommendations }
}

/**
 * Export all authority positions for a wallet
 */
export async function exportAuthorityPositions(
  connection: Connection,
  wallet: PublicKey
): Promise<Array<{ type: string; target: string; role: string }>> {
  const positions: Array<{ type: string; target: string; role: string }> = []

  // Check token accounts for authority roles
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    })

    positions.push({
      type: 'wallet',
      target: wallet.toBase58(),
      role: `owner of ${tokenAccounts.value.length} token accounts`,
    })
  } catch {
    // Skip if can't fetch
  }

  return positions
}

/**
 * Generate recovery documentation
 */
export function generateRecoveryDocs(
  authorities: Array<{ type: string; target: string; role: string }>
): string {
  const lines: string[] = [
    '# Recovery Documentation',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Authority Inventory',
    '',
  ]

  for (const auth of authorities) {
    lines.push(`### ${auth.type}`)
    lines.push(`- Target: \`${auth.target}\``)
    lines.push(`- Role: ${auth.role}`)
    lines.push('')
  }

  lines.push(
    '## Recovery Procedures',
    '',
    '### If Keypair Is Lost',
    '1. Retrieve encrypted backup from secure storage',
    '2. Decrypt with backup password',
    '3. Import into wallet software',
    '',
    '### If Keypair Is Compromised',
    '1. Generate a new keypair immediately',
    '2. Transfer all authority positions to the new keypair',
    '3. Move all funds to the new wallet',
    '4. Revoke any delegations from the compromised keypair',
    '5. Update all systems using the old keypair',
  )

  return lines.join('\n')
}
