/**
 * Operational Security
 *
 * Environment security checks, audit logging, and sensitive data handling.
 */

import type { SecurityCheckResult } from './checks'

/**
 * Check environment security
 */
export function checkEnvironmentSecurity(): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check NODE_ENV
  if (process.env.NODE_ENV === 'development') {
    recommendations.push('Running in development mode — ensure production deployments use NODE_ENV=production')
  }

  // Check for debug flags that might leak sensitive info
  if (process.env.DEBUG) {
    warnings.push('DEBUG environment variable is set — may expose sensitive information in logs')
    recommendations.push('Disable DEBUG in production environments')
  }

  // Check for common insecure environment patterns
  if (process.env.SOLANA_PRIVATE_KEY || process.env.PRIVATE_KEY) {
    warnings.push('Private key found in environment variable — high risk of exposure')
    recommendations.push('Use encrypted keyring storage instead of environment variables for private keys')
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Advisory warning about clipboard exposure
 */
export function checkClipboardExposure(): SecurityCheckResult {
  return {
    safe: true,
    warnings: [],
    recommendations: [
      'Avoid copying private keys or seed phrases to clipboard',
      'If you must copy sensitive data, clear clipboard immediately after use',
      'Some malware monitors clipboard for cryptocurrency addresses and keys',
    ],
  }
}

/**
 * Verify RPC connection uses HTTPS
 */
export function checkSecureConnection(rpcUrl: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (rpcUrl.startsWith('http://')) {
    if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) {
      // Local connections are OK
      recommendations.push('Local RPC connection detected — fine for development')
    } else {
      warnings.push('RPC connection uses unencrypted HTTP')
      recommendations.push('Use HTTPS for RPC connections to prevent data interception')
    }
  }

  if (rpcUrl.includes('api.mainnet-beta.solana.com')) {
    recommendations.push('Consider using a dedicated RPC provider for better reliability and rate limits')
  }

  return { safe: !rpcUrl.startsWith('http://') || rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1'), warnings, recommendations }
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  timestamp: Date
  action: string
  actor: string
  target: string
  details: Record<string, unknown>
  success: boolean
}

/**
 * Audit logger for security-sensitive operations
 */
export class AuditLogger {
  private entries: AuditLogEntry[] = []

  /**
   * Log an audit entry
   */
  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    this.entries.push({
      ...entry,
      timestamp: new Date(),
    })
  }

  /**
   * Get log entries with optional filter
   */
  getEntries(filter?: {
    action?: string
    actor?: string
    since?: Date
    success?: boolean
  }): AuditLogEntry[] {
    let result = [...this.entries]

    if (filter?.action) {
      result = result.filter(e => e.action === filter.action)
    }
    if (filter?.actor) {
      result = result.filter(e => e.actor === filter.actor)
    }
    if (filter?.since) {
      result = result.filter(e => e.timestamp >= filter.since!)
    }
    if (filter?.success !== undefined) {
      result = result.filter(e => e.success === filter.success)
    }

    return result
  }

  /**
   * Export log entries
   */
  export(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.entries, (_, value) =>
        value instanceof Date ? value.toISOString() : value
      , 2)
    }

    // CSV format
    const headers = ['timestamp', 'action', 'actor', 'target', 'success', 'details']
    const rows = this.entries.map(e => [
      e.timestamp.toISOString(),
      e.action,
      e.actor,
      e.target,
      String(e.success),
      JSON.stringify(e.details),
    ].map(v => `"${v.replace(/"/g, '""')}"`).join(','))

    return [headers.join(','), ...rows].join('\n')
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.entries = []
  }
}

/**
 * Check session timeout configuration
 */
export function checkSessionTimeout(expiresAt: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const remainingMs = expiresAt - Date.now()
  const remainingMinutes = remainingMs / 60000

  if (remainingMinutes > 120) {
    warnings.push('Session timeout is more than 2 hours — increases exposure window')
    recommendations.push('Use shorter session timeouts (30 minutes recommended)')
  }

  if (remainingMs <= 0) {
    warnings.push('Session has expired')
    recommendations.push('Re-authenticate to continue')
  }

  return { safe: remainingMs > 0 && remainingMinutes <= 120, warnings, recommendations }
}

/**
 * Zero-fill a buffer containing sensitive data
 */
export function secureClearMemory(buffer: Uint8Array | Buffer): void {
  buffer.fill(0)
}

/**
 * Check if sensitive data might be logged
 */
export function checkSensitiveLogging(config: {
  verbose?: boolean
  logLevel?: string
}): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (config.verbose) {
    warnings.push('Verbose logging is enabled — may expose sensitive data')
    recommendations.push('Disable verbose logging in production')
  }

  if (config.logLevel === 'debug' || config.logLevel === 'trace') {
    warnings.push(`Log level "${config.logLevel}" may expose sensitive transaction details`)
    recommendations.push('Use "info" or "warn" log level in production')
  }

  return { safe: !config.verbose, warnings, recommendations }
}
