/**
 * Security Report Generation
 *
 * Comprehensive report aggregation, formatting, and comparison.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { AuditReport, AuditFinding } from './audit'

/**
 * Comprehensive security report
 */
export interface ComprehensiveSecurityReport {
  generatedAt: Date
  overallRiskScore: number
  executiveSummary: string
  sections: ReportSection[]
  reports: AuditReport[]
  criticalFindings: AuditFinding[]
  recommendations: PrioritizedRecommendation[]
  metadata: Record<string, unknown>
}

/**
 * Report section
 */
export interface ReportSection {
  title: string
  riskScore: number
  findings: AuditFinding[]
  summary: string
}

/**
 * Prioritized recommendation
 */
export interface PrioritizedRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  recommendation: string
  effort: 'low' | 'medium' | 'high'
}

/**
 * Generate a comprehensive security report from multiple audits
 */
export async function generateComprehensiveReport(options: {
  connection: Connection
  tokens?: PublicKey[]
  collections?: PublicKey[]
  candyMachines?: PublicKey[]
  daos?: PublicKey[]
  stakingPools?: PublicKey[]
  wallet?: PublicKey
  existingReports?: AuditReport[]
}): Promise<ComprehensiveSecurityReport> {
  const reports: AuditReport[] = [...(options.existingReports ?? [])]

  // Import audit functions dynamically to avoid circular deps
  const { auditToken, auditCollection, auditWallet } = await import('./audit')

  if (options.tokens) {
    for (const mint of options.tokens) {
      reports.push(await auditToken(options.connection, mint))
    }
  }

  if (options.collections) {
    for (const col of options.collections) {
      reports.push(await auditCollection(options.connection, col))
    }
  }

  if (options.wallet) {
    reports.push(await auditWallet(options.connection, options.wallet))
  }

  // Candy machines
  if (options.candyMachines) {
    const { fullCandyMachineSecurityCheck } = await import('./candy-machine-checks')
    for (const cm of options.candyMachines) {
      reports.push(await fullCandyMachineSecurityCheck(options.connection, cm))
    }
  }

  // DAOs
  if (options.daos) {
    const { fullGovernanceSecurityCheck } = await import('./governance-checks')
    for (const dao of options.daos) {
      reports.push(await fullGovernanceSecurityCheck(options.connection, dao))
    }
  }

  // Staking pools
  if (options.stakingPools) {
    const { fullStakingSecurityCheck } = await import('./staking-checks')
    for (const pool of options.stakingPools) {
      reports.push(await fullStakingSecurityCheck(options.connection, pool))
    }
  }

  const overallRiskScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + r.riskScore, 0) / reports.length)
    : 0

  const allFindings = reports.flatMap(r => r.findings)
  const criticalFindings = allFindings.filter(f => f.severity === 'critical' || f.severity === 'high')

  const sections = buildSections(reports)
  const recommendations = prioritizeRecommendations(allFindings)
  const executiveSummary = generateExecutiveSummary(reports)

  return {
    generatedAt: new Date(),
    overallRiskScore,
    executiveSummary,
    sections,
    reports,
    criticalFindings,
    recommendations,
    metadata: {
      totalReports: reports.length,
      totalFindings: allFindings.length,
      criticalCount: criticalFindings.length,
    },
  }
}

/**
 * Build report sections grouped by target type
 */
function buildSections(reports: AuditReport[]): ReportSection[] {
  const groups = new Map<string, AuditReport[]>()

  for (const report of reports) {
    const key = report.targetType
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(report)
  }

  const sections: ReportSection[] = []
  for (const [type, typeReports] of groups) {
    const findings = typeReports.flatMap(r => r.findings)
    const riskScore = Math.round(typeReports.reduce((s, r) => s + r.riskScore, 0) / typeReports.length)
    sections.push({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Security`,
      riskScore,
      findings,
      summary: `${typeReports.length} ${type}(s) audited. Average risk: ${riskScore}/100.`,
    })
  }

  return sections
}

/**
 * Generate executive summary from reports
 */
export function generateExecutiveSummary(reports: AuditReport[]): string {
  if (reports.length === 0) return 'No items audited.'

  const totalFindings = reports.reduce((sum, r) => sum + r.findings.length, 0)
  const criticalCount = reports.flatMap(r => r.findings).filter(f => f.severity === 'critical').length
  const highCount = reports.flatMap(r => r.findings).filter(f => f.severity === 'high').length
  const avgRisk = Math.round(reports.reduce((s, r) => s + r.riskScore, 0) / reports.length)

  const parts: string[] = [
    `Security audit of ${reports.length} item(s) complete.`,
    `Overall risk score: ${avgRisk}/100.`,
    `Total findings: ${totalFindings}.`,
  ]

  if (criticalCount > 0) {
    parts.push(`CRITICAL: ${criticalCount} critical finding(s) require immediate attention.`)
  }
  if (highCount > 0) {
    parts.push(`${highCount} high-severity finding(s) should be addressed promptly.`)
  }
  if (criticalCount === 0 && highCount === 0) {
    parts.push('No critical or high-severity issues found.')
  }

  return parts.join(' ')
}

/**
 * Prioritize recommendations by severity and effort
 */
export function prioritizeRecommendations(findings: AuditFinding[]): PrioritizedRecommendation[] {
  const recs: PrioritizedRecommendation[] = []

  for (const finding of findings) {
    if (!finding.recommendation) continue

    const priority = finding.severity === 'critical' ? 'critical'
      : finding.severity === 'high' ? 'high'
      : finding.severity === 'medium' ? 'medium'
      : 'low'

    const effort = finding.recommendation.length > 100 ? 'high'
      : finding.recommendation.length > 50 ? 'medium'
      : 'low'

    recs.push({
      priority,
      category: finding.category,
      recommendation: finding.recommendation,
      effort,
    })
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return recs
}

/**
 * Format report as Markdown
 */
export function formatReportAsMarkdown(report: ComprehensiveSecurityReport): string {
  const lines: string[] = []

  lines.push('# Security Report')
  lines.push('')
  lines.push(`**Generated:** ${report.generatedAt.toISOString()}`)
  lines.push(`**Overall Risk Score:** ${report.overallRiskScore}/100`)
  lines.push('')
  lines.push('## Executive Summary')
  lines.push('')
  lines.push(report.executiveSummary)
  lines.push('')

  if (report.criticalFindings.length > 0) {
    lines.push('## Critical Findings')
    lines.push('')
    for (const finding of report.criticalFindings) {
      lines.push(`- **[${finding.severity.toUpperCase()}]** ${finding.title}: ${finding.description}`)
      if (finding.recommendation) {
        lines.push(`  - *Recommendation:* ${finding.recommendation}`)
      }
    }
    lines.push('')
  }

  for (const section of report.sections) {
    lines.push(`## ${section.title}`)
    lines.push('')
    lines.push(`Risk Score: ${section.riskScore}/100`)
    lines.push('')
    for (const finding of section.findings) {
      const icon = finding.severity === 'critical' ? '🔴' : finding.severity === 'high' ? '🟠' : finding.severity === 'medium' ? '🟡' : finding.severity === 'low' ? '🔵' : 'ℹ️'
      lines.push(`- ${icon} **${finding.title}** (${finding.severity}): ${finding.description}`)
    }
    lines.push('')
  }

  if (report.recommendations.length > 0) {
    lines.push('## Prioritized Recommendations')
    lines.push('')
    for (const rec of report.recommendations) {
      lines.push(`- **[${rec.priority.toUpperCase()}]** (${rec.effort} effort) ${rec.recommendation}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format report as JSON
 */
export function formatReportAsJson(report: ComprehensiveSecurityReport): string {
  return JSON.stringify(report, (_, value) =>
    value instanceof Date ? value.toISOString() : value
  , 2)
}

/**
 * Format report as HTML
 */
export function formatReportAsHtml(report: ComprehensiveSecurityReport): string {
  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return '#dc2626'
      case 'high': return '#ea580c'
      case 'medium': return '#ca8a04'
      case 'low': return '#2563eb'
      default: return '#6b7280'
    }
  }

  const lines: string[] = [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8"><title>Security Report</title>',
    '<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px}',
    '.finding{margin:8px 0;padding:8px;border-left:4px solid #ccc;background:#f9f9f9}',
    '.critical{border-color:#dc2626}.high{border-color:#ea580c}.medium{border-color:#ca8a04}.low{border-color:#2563eb}',
    '</style></head><body>',
    `<h1>Security Report</h1>`,
    `<p><strong>Generated:</strong> ${report.generatedAt.toISOString()}</p>`,
    `<p><strong>Overall Risk Score:</strong> ${report.overallRiskScore}/100</p>`,
    `<h2>Executive Summary</h2><p>${report.executiveSummary}</p>`,
  ]

  for (const section of report.sections) {
    lines.push(`<h2>${section.title}</h2>`)
    lines.push(`<p>Risk Score: ${section.riskScore}/100</p>`)
    for (const f of section.findings) {
      lines.push(`<div class="finding ${f.severity}"><strong style="color:${severityColor(f.severity)}">[${f.severity.toUpperCase()}]</strong> ${f.title}: ${f.description}</div>`)
    }
  }

  if (report.recommendations.length > 0) {
    lines.push('<h2>Recommendations</h2><ul>')
    for (const rec of report.recommendations) {
      lines.push(`<li><strong>[${rec.priority.toUpperCase()}]</strong> (${rec.effort} effort) ${rec.recommendation}</li>`)
    }
    lines.push('</ul>')
  }

  lines.push('</body></html>')
  return lines.join('\n')
}

/**
 * Compare current report with a previous report to highlight changes
 */
export function compareWithPreviousReport(
  current: ComprehensiveSecurityReport,
  previous: ComprehensiveSecurityReport
): {
  riskScoreChange: number
  newFindings: AuditFinding[]
  resolvedFindings: AuditFinding[]
  summary: string
} {
  const riskScoreChange = current.overallRiskScore - previous.overallRiskScore

  const currentTitles = new Set(current.criticalFindings.map(f => f.title))
  const previousTitles = new Set(previous.criticalFindings.map(f => f.title))

  const newFindings = current.criticalFindings.filter(f => !previousTitles.has(f.title))
  const resolvedFindings = previous.criticalFindings.filter(f => !currentTitles.has(f.title))

  const parts: string[] = []
  if (riskScoreChange > 0) {
    parts.push(`Risk increased by ${riskScoreChange} points.`)
  } else if (riskScoreChange < 0) {
    parts.push(`Risk decreased by ${Math.abs(riskScoreChange)} points.`)
  } else {
    parts.push('Risk score unchanged.')
  }
  if (newFindings.length > 0) parts.push(`${newFindings.length} new critical/high finding(s).`)
  if (resolvedFindings.length > 0) parts.push(`${resolvedFindings.length} finding(s) resolved.`)

  return {
    riskScoreChange,
    newFindings,
    resolvedFindings,
    summary: parts.join(' '),
  }
}
