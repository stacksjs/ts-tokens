/**
 * Security Monitoring
 *
 * Real-time security event monitoring for addresses.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'

/**
 * Security event
 */
export interface SecurityEvent {
  type: 'authority_change' | 'large_transfer' | 'suspicious_approval' | 'new_token' | 'account_drain'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  timestamp: Date
  address: string
  details: Record<string, unknown>
}

/**
 * Security monitor for watching addresses
 */
export class SecurityMonitor {
  private connection: Connection
  private addresses: Set<string> = new Set()
  private events: SecurityEvent[] = []
  private intervalId: ReturnType<typeof setInterval> | null = null
  private intervalMs: number
  private webhookUrl: string | null
  private lastSignatures = new Map<string, string>()
  private notificationDispatcher: ((event: SecurityEvent) => Promise<unknown>) | null = null

  constructor(connection: Connection, options?: {
    intervalMs?: number
    webhookUrl?: string
    notificationConfigs?: import('./notifications').NotificationConfig[]
  }) {
    this.connection = connection
    this.intervalMs = options?.intervalMs ?? 30000
    this.webhookUrl = options?.webhookUrl ?? null

    if (options?.notificationConfigs?.length) {
      import('./notifications').then(({ createNotificationDispatcher }) => {
        this.notificationDispatcher = createNotificationDispatcher(options.notificationConfigs!)
      })
    }
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.intervalId) return

    this.intervalId = setInterval(async () => {
      await this.poll()
    }, this.intervalMs)

    // Initial poll
    this.poll()
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Add an address to monitor
   */
  addAddress(address: string): void {
    this.addresses.add(address)
  }

  /**
   * Remove an address from monitoring
   */
  removeAddress(address: string): void {
    this.addresses.delete(address)
    this.lastSignatures.delete(address)
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit = 50): SecurityEvent[] {
    return this.events.slice(-limit)
  }

  private async poll(): Promise<void> {
    for (const address of this.addresses) {
      try {
        const pubkey = new PublicKey(address)
        const opts: { limit: number; until?: string } = { limit: 10 }

        const lastSig = this.lastSignatures.get(address)
        if (lastSig) {
          opts.until = lastSig
        }

        const signatures = await this.connection.getSignaturesForAddress(pubkey, opts)

        if (signatures.length > 0) {
          this.lastSignatures.set(address, signatures[0].signature)
        }

        // Skip on first poll (just establish baseline)
        if (!lastSig) continue

        for (const sig of signatures) {
          // Get transaction details
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          })

          if (!tx) continue

          // Check for large SOL transfers
          const balanceChanges = tx.meta?.preBalances && tx.meta?.postBalances
            ? tx.meta.preBalances.map((pre, i) => ({
                change: (tx.meta!.postBalances[i] - pre),
                index: i,
              }))
            : []

          for (const bc of balanceChanges) {
            if (Math.abs(bc.change) > 10 * 1e9) { // > 10 SOL
              const event: SecurityEvent = {
                type: 'large_transfer',
                severity: Math.abs(bc.change) > 100 * 1e9 ? 'high' : 'medium',
                timestamp: new Date((tx.blockTime ?? 0) * 1000),
                address,
                details: { signature: sig.signature, changeLamports: bc.change },
              }
              this.events.push(event)
              if (this.webhookUrl) {
                sendWebhookNotification(this.webhookUrl, event).catch(() => {})
              }
              if (this.notificationDispatcher) {
                this.notificationDispatcher(event).catch(() => {})
              }
            }
          }
        }
      } catch {
        // Skip errors for individual addresses
      }
    }
  }
}

/**
 * Send webhook notification for a security event
 */
export async function sendWebhookNotification(url: string, event: SecurityEvent): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...event,
      timestamp: event.timestamp.toISOString(),
    }),
    signal: AbortSignal.timeout(10000),
  })
}

/**
 * Format a security event for display
 */
export function formatSecurityEvent(event: SecurityEvent): string {
  const severity = event.severity.toUpperCase().padEnd(8)
  const type = event.type.replace(/_/g, ' ')
  const time = event.timestamp.toISOString()
  return `[${severity}] ${time} | ${type} | ${event.address} | ${JSON.stringify(event.details)}`
}
