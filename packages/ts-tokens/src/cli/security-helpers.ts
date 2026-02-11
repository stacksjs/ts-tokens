/**
 * Security CLI Helpers
 *
 * Formatting utilities for security audit CLI output.
 */

import type { AuditFinding, AuditReport } from '../security/audit'

/**
 * Get severity indicator string for a finding
 */
export function severityIndicator(severity: AuditFinding['severity']): string {
  switch (severity) {
    case 'critical': return '[!]'
    case 'high': return '[H]'
    case 'medium': return '[M]'
    case 'low': return '[L]'
    case 'info': return '[i]'
    default: return '[?]'
  }
}

/**
 * Format a single audit finding for display
 */
export function formatFinding(finding: AuditFinding, index: number): string {
  const indicator = severityIndicator(finding.severity)
  const lines: string[] = []

  lines.push(`  ${index + 1}. ${indicator} ${finding.title}`)
  lines.push(`     Severity: ${finding.severity} | Category: ${finding.category}`)
  lines.push(`     ${finding.description}`)

  if (finding.recommendation) {
    lines.push(`     Recommendation: ${finding.recommendation}`)
  }

  return lines.join('\n')
}

/**
 * Format a risk score with descriptive label
 */
export function formatRiskScore(score: number): string {
  let level: string
  if (score <= 20) level = 'Low'
  else if (score <= 40) level = 'Moderate'
  else if (score <= 60) level = 'Elevated'
  else if (score <= 80) level = 'High'
  else level = 'Critical'

  return `${score}/100 (${level})`
}

/**
 * Format a full audit report for display
 */
export function formatAuditReport(report: AuditReport): string {
  const lines: string[] = []

  lines.push(`Audit Report: ${report.targetType} — ${report.target}`)
  lines.push(`Date: ${report.timestamp.toISOString()}`)
  lines.push(`Risk Score: ${formatRiskScore(report.riskScore)}`)
  lines.push('')

  if (report.findings.length > 0) {
    lines.push('Findings:')
    for (let i = 0; i < report.findings.length; i++) {
      lines.push(formatFinding(report.findings[i], i))
    }
    lines.push('')
  }

  if (report.recommendations.length > 0) {
    lines.push('Recommendations:')
    for (const rec of report.recommendations) {
      lines.push(`  - ${rec}`)
    }
    lines.push('')
  }

  lines.push(`Summary: ${report.summary}`)

  return lines.join('\n')
}

/**
 * Format multiple audit reports into a security report display
 */
export function formatSecurityReport(reports: {
  reports: AuditReport[]
  overallRiskScore: number
  summary: string
}): string {
  const lines: string[] = []

  lines.push('=== Security Report ===')
  lines.push(`Overall Risk Score: ${formatRiskScore(reports.overallRiskScore)}`)
  lines.push(`Items Audited: ${reports.reports.length}`)
  lines.push('')

  for (const report of reports.reports) {
    lines.push('---')
    lines.push(formatAuditReport(report))
    lines.push('')
  }

  lines.push(`Summary: ${reports.summary}`)

  return lines.join('\n')
}

/**
 * Format a transaction security check result
 */
export function formatTransactionCheck(result: { safe: boolean; warnings: string[]; recommendations: string[] }, signature: string): string {
  const lines: string[] = []
  lines.push(`Transaction Check: ${signature}`)
  lines.push(`Status: ${result.safe ? 'SAFE' : 'WARNING'}`)

  if (result.warnings.length > 0) {
    lines.push('')
    lines.push('Warnings:')
    for (const w of result.warnings) {
      lines.push(`  [!] ${w}`)
    }
  }

  if (result.recommendations.length > 0) {
    lines.push('')
    lines.push('Recommendations:')
    for (const r of result.recommendations) {
      lines.push(`  - ${r}`)
    }
  }

  return lines.join('\n')
}

/**
 * Format an address security check result
 */
export function formatAddressCheck(result: { safe: boolean; warnings: string[]; recommendations: string[] }, address: string): string {
  const lines: string[] = []
  lines.push(`Address Check: ${address}`)
  lines.push(`Status: ${result.safe ? 'SAFE' : 'WARNING'}`)

  if (result.warnings.length > 0) {
    lines.push('')
    lines.push('Warnings:')
    for (const w of result.warnings) {
      lines.push(`  [!] ${w}`)
    }
  }

  if (result.recommendations.length > 0) {
    lines.push('')
    lines.push('Recommendations:')
    for (const r of result.recommendations) {
      lines.push(`  - ${r}`)
    }
  }

  return lines.join('\n')
}

/**
 * Format a security monitoring event
 */
export function formatWatchEvent(event: { type: string; severity: string; timestamp: Date; address: string; details: Record<string, unknown> }): string {
  const severity = event.severity.toUpperCase().padEnd(8)
  const type = event.type.replace(/_/g, ' ')
  const time = event.timestamp.toLocaleTimeString()
  return `[${severity}] ${time} | ${type} | ${event.address}`
}
