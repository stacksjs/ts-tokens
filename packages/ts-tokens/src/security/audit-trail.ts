/**
 * Tamper-Evident Audit Trail
 *
 * SHA-256 hash chain for tamper detection on audit log entries.
 */

import * as crypto from 'node:crypto'
import * as fs from 'node:fs'

/**
 * Audit entry
 */
export interface AuditEntry {
  id: string
  timestamp: Date
  action: string
  actor: string
  details: Record<string, unknown>
  hash: string
  previousHash: string
}

/**
 * Tamper-evident audit trail with SHA-256 hash chain
 */
export class TamperEvidentAuditTrail {
  private entries: AuditEntry[] = []
  private lastHash: string = '0'.repeat(64)

  /**
   * Add an entry to the audit trail
   */
  addEntry(action: string, actor: string, details: Record<string, unknown> = {}): AuditEntry {
    const id = crypto.randomUUID()
    const timestamp = new Date()
    const previousHash = this.lastHash

    const payload = JSON.stringify({
      id,
      timestamp: timestamp.toISOString(),
      action,
      actor,
      details,
      previousHash,
    })

    const hash = crypto.createHash('sha256').update(payload).digest('hex')

    const entry: AuditEntry = {
      id,
      timestamp,
      action,
      actor,
      details,
      hash,
      previousHash,
    }

    this.entries.push(entry)
    this.lastHash = hash

    return entry
  }

  /**
   * Get all entries
   */
  getEntries(): AuditEntry[] {
    return [...this.entries]
  }

  /**
   * Get entry count
   */
  get length(): number {
    return this.entries.length
  }

  /**
   * Verify the integrity of the entire audit trail
   */
  verify(): { valid: boolean; brokenAt?: number; error?: string } {
    let previousHash = '0'.repeat(64)

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i]

      if (entry.previousHash !== previousHash) {
        return {
          valid: false,
          brokenAt: i,
          error: `Chain broken at entry ${i}: previousHash mismatch`,
        }
      }

      const payload = JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        action: entry.action,
        actor: entry.actor,
        details: entry.details,
        previousHash: entry.previousHash,
      })

      const expectedHash = crypto.createHash('sha256').update(payload).digest('hex')

      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          brokenAt: i,
          error: `Tampered entry at index ${i}: hash mismatch`,
        }
      }

      previousHash = entry.hash
    }

    return { valid: true }
  }

  /**
   * Persist the audit trail to disk with restricted permissions
   */
  persist(filePath: string): void {
    const data = JSON.stringify(
      this.entries.map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      })),
      null,
      2
    )
    fs.writeFileSync(filePath, data, { mode: 0o600 })
  }

  /**
   * Load an audit trail from disk
   */
  static load(filePath: string): TamperEvidentAuditTrail {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audit trail file not found: ${filePath}`)
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const rawEntries = JSON.parse(content) as Array<any>

    const trail = new TamperEvidentAuditTrail()

    for (const raw of rawEntries) {
      const entry: AuditEntry = {
        id: raw.id,
        timestamp: new Date(raw.timestamp),
        action: raw.action,
        actor: raw.actor,
        details: raw.details,
        hash: raw.hash,
        previousHash: raw.previousHash,
      }
      trail.entries.push(entry)
      trail.lastHash = entry.hash
    }

    return trail
  }
}
