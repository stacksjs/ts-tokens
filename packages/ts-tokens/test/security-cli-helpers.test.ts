/**
 * Security CLI Helpers Tests
 *
 * Tests for severity indicators, report formatting, and risk score ranges.
 */

import { describe, test, expect } from 'bun:test'
import {
  severityIndicator,
  formatFinding,
  formatAuditReport,
  formatSecurityReport,
  formatRiskScore,
} from '../src/cli/security-helpers'
import type { AuditFinding, AuditReport } from '../src/security/audit'

// ---------------------------------------------------------------------------
// severityIndicator
// ---------------------------------------------------------------------------

describe('severityIndicator', () => {
  test('returns [!] for critical', () => {
    expect(severityIndicator('critical')).toBe('[!]')
  })

  test('returns [H] for high', () => {
    expect(severityIndicator('high')).toBe('[H]')
  })

  test('returns [M] for medium', () => {
    expect(severityIndicator('medium')).toBe('[M]')
  })

  test('returns [L] for low', () => {
    expect(severityIndicator('low')).toBe('[L]')
  })

  test('returns [i] for info', () => {
    expect(severityIndicator('info')).toBe('[i]')
  })
})

// ---------------------------------------------------------------------------
// formatRiskScore
// ---------------------------------------------------------------------------

describe('formatRiskScore', () => {
  test('0 is Low', () => {
    expect(formatRiskScore(0)).toBe('0/100 (Low)')
  })

  test('20 is Low', () => {
    expect(formatRiskScore(20)).toBe('20/100 (Low)')
  })

  test('21 is Moderate', () => {
    expect(formatRiskScore(21)).toBe('21/100 (Moderate)')
  })

  test('40 is Moderate', () => {
    expect(formatRiskScore(40)).toBe('40/100 (Moderate)')
  })

  test('41 is Elevated', () => {
    expect(formatRiskScore(41)).toBe('41/100 (Elevated)')
  })

  test('60 is Elevated', () => {
    expect(formatRiskScore(60)).toBe('60/100 (Elevated)')
  })

  test('61 is High', () => {
    expect(formatRiskScore(61)).toBe('61/100 (High)')
  })

  test('80 is High', () => {
    expect(formatRiskScore(80)).toBe('80/100 (High)')
  })

  test('81 is Critical', () => {
    expect(formatRiskScore(81)).toBe('81/100 (Critical)')
  })

  test('100 is Critical', () => {
    expect(formatRiskScore(100)).toBe('100/100 (Critical)')
  })
})

// ---------------------------------------------------------------------------
// formatFinding
// ---------------------------------------------------------------------------

describe('formatFinding', () => {
  const finding: AuditFinding = {
    severity: 'high',
    category: 'authority',
    title: 'Freeze authority is set',
    description: 'The token has an active freeze authority',
    recommendation: 'Revoke freeze authority',
  }

  test('includes severity indicator', () => {
    const output = formatFinding(finding, 0)
    expect(output).toContain('[H]')
  })

  test('includes title and description', () => {
    const output = formatFinding(finding, 0)
    expect(output).toContain('Freeze authority is set')
    expect(output).toContain('The token has an active freeze authority')
  })

  test('includes recommendation when present', () => {
    const output = formatFinding(finding, 0)
    expect(output).toContain('Recommendation: Revoke freeze authority')
  })

  test('omits recommendation line when not present', () => {
    const noRec: AuditFinding = { ...finding, recommendation: undefined }
    const output = formatFinding(noRec, 0)
    expect(output).not.toContain('Recommendation:')
  })

  test('uses 1-based index', () => {
    const output = formatFinding(finding, 2)
    expect(output).toContain('3.')
  })
})

// ---------------------------------------------------------------------------
// formatAuditReport
// ---------------------------------------------------------------------------

describe('formatAuditReport', () => {
  const report: AuditReport = {
    timestamp: new Date('2024-01-15T10:00:00Z'),
    target: 'SomeTokenMint123',
    targetType: 'token',
    riskScore: 50,
    findings: [
      {
        severity: 'medium',
        category: 'authority',
        title: 'Mint authority is set',
        description: 'Active mint authority',
        recommendation: 'Revoke if fixed supply',
      },
    ],
    recommendations: ['Revoke mint authority'],
    summary: 'Medium severity issues found',
  }

  test('includes target and type', () => {
    const output = formatAuditReport(report)
    expect(output).toContain('token')
    expect(output).toContain('SomeTokenMint123')
  })

  test('includes formatted risk score', () => {
    const output = formatAuditReport(report)
    expect(output).toContain('50/100 (Elevated)')
  })

  test('includes findings', () => {
    const output = formatAuditReport(report)
    expect(output).toContain('Mint authority is set')
  })

  test('includes recommendations', () => {
    const output = formatAuditReport(report)
    expect(output).toContain('Revoke mint authority')
  })

  test('includes summary', () => {
    const output = formatAuditReport(report)
    expect(output).toContain('Medium severity issues found')
  })
})

// ---------------------------------------------------------------------------
// formatSecurityReport
// ---------------------------------------------------------------------------

describe('formatSecurityReport', () => {
  test('includes overall risk score and item count', () => {
    const secReport = {
      reports: [],
      overallRiskScore: 25,
      summary: 'Audited 0 items',
    }
    const output = formatSecurityReport(secReport)
    expect(output).toContain('=== Security Report ===')
    expect(output).toContain('25/100 (Moderate)')
    expect(output).toContain('Items Audited: 0')
  })

  test('includes individual report sections', () => {
    const report: AuditReport = {
      timestamp: new Date(),
      target: 'TestMint',
      targetType: 'token',
      riskScore: 0,
      findings: [],
      recommendations: [],
      summary: 'No issues',
    }
    const secReport = {
      reports: [report],
      overallRiskScore: 0,
      summary: 'All clear',
    }
    const output = formatSecurityReport(secReport)
    expect(output).toContain('TestMint')
    expect(output).toContain('All clear')
  })
})
