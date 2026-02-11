/**
 * Dependency Security
 *
 * Audit dependencies for suspicious scripts, verify lock file integrity,
 * and check for known vulnerabilities.
 */

import * as fs from 'node:fs'
import * as crypto from 'node:crypto'

/**
 * Dependency audit result
 */
export interface DependencyAuditResult {
  safe: boolean
  warnings: string[]
  suspiciousPackages: Array<{
    name: string
    reason: string
  }>
}

/**
 * Lock file integrity result
 */
export interface LockFileIntegrityResult {
  valid: boolean
  hash: string
  error?: string
}

/**
 * Vulnerability check result
 */
export interface VulnerabilityResult {
  vulnerable: boolean
  vulnerabilities: Array<{
    package: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    description: string
  }>
}

const SUSPICIOUS_SCRIPTS = [
  'preinstall',
  'postinstall',
  'preuninstall',
  'postuninstall',
]

const SUSPICIOUS_PATTERNS = [
  /eval\s*\(/,
  /child_process/,
  /exec\s*\(/,
  /curl\s/,
  /wget\s/,
  /\.env/,
  /process\.env/,
  /require\(['"]https?/,
  /fetch\(['"]https?/,
]

/**
 * Audit dependencies in a package.json for suspicious scripts
 */
export function auditDependencies(packageJsonPath: string): DependencyAuditResult {
  if (!fs.existsSync(packageJsonPath)) {
    return { safe: false, warnings: [`File not found: ${packageJsonPath}`], suspiciousPackages: [] }
  }

  const content = fs.readFileSync(packageJsonPath, 'utf-8')
  const pkg = JSON.parse(content)

  const warnings: string[] = []
  const suspiciousPackages: DependencyAuditResult['suspiciousPackages'] = []

  // Check for lifecycle scripts in the package itself
  if (pkg.scripts) {
    for (const scriptName of SUSPICIOUS_SCRIPTS) {
      if (pkg.scripts[scriptName]) {
        const scriptValue = pkg.scripts[scriptName]
        warnings.push(`Package has ${scriptName} script: "${scriptValue}"`)

        for (const pattern of SUSPICIOUS_PATTERNS) {
          if (pattern.test(scriptValue)) {
            suspiciousPackages.push({
              name: pkg.name ?? 'root',
              reason: `${scriptName} script contains suspicious pattern: ${pattern.source}`,
            })
          }
        }
      }
    }
  }

  // Check dependency names for typosquatting patterns
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  }

  const knownScoped = ['@solana/', '@coral-xyz/', '@metaplex-foundation/', '@types/']

  for (const depName of Object.keys(allDeps ?? {})) {
    // Check for suspicious characters
    if (/[^a-z0-9@/._-]/i.test(depName)) {
      suspiciousPackages.push({
        name: depName,
        reason: 'Package name contains unusual characters',
      })
    }

    // Check for very short unscoped package names (potential typosquatting)
    if (!depName.startsWith('@') && depName.length <= 2) {
      warnings.push(`Very short package name: "${depName}" — verify it is legitimate`)
    }

    // Check for unknown scoped packages
    if (depName.startsWith('@') && !knownScoped.some(prefix => depName.startsWith(prefix))) {
      // Not necessarily suspicious, just a note
      warnings.push(`Scoped package from non-standard org: "${depName}"`)
    }
  }

  return {
    safe: suspiciousPackages.length === 0,
    warnings,
    suspiciousPackages,
  }
}

/**
 * Verify lock file integrity by computing its hash
 */
export function verifyLockFileIntegrity(
  lockFilePath: string,
  expectedHash?: string
): LockFileIntegrityResult {
  if (!fs.existsSync(lockFilePath)) {
    return { valid: false, hash: '', error: `Lock file not found: ${lockFilePath}` }
  }

  const content = fs.readFileSync(lockFilePath)
  const hash = crypto.createHash('sha256').update(content).digest('hex')

  if (expectedHash && hash !== expectedHash) {
    return {
      valid: false,
      hash,
      error: `Lock file hash mismatch: expected ${expectedHash}, got ${hash}`,
    }
  }

  return { valid: true, hash }
}

/**
 * Check dependencies against a vulnerability endpoint
 */
export async function checkVulnerableDependencies(
  deps: Record<string, string>,
  endpoint?: string
): Promise<VulnerabilityResult> {
  if (!endpoint) {
    // Without an endpoint, do basic version checks
    const vulnerabilities: VulnerabilityResult['vulnerabilities'] = []

    for (const [name, version] of Object.entries(deps)) {
      // Check for wildcard or very permissive version ranges
      if (version === '*' || version === 'latest') {
        vulnerabilities.push({
          package: name,
          severity: 'medium',
          description: `Unpinned version "${version}" may resolve to a vulnerable release`,
        })
      }

      // Check for git URLs (could be compromised)
      if (version.startsWith('git') || version.startsWith('http')) {
        vulnerabilities.push({
          package: name,
          severity: 'high',
          description: 'Dependency resolved from URL — cannot verify package integrity',
        })
      }
    }

    return {
      vulnerable: vulnerabilities.length > 0,
      vulnerabilities,
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dependencies: deps }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return { vulnerable: false, vulnerabilities: [] }
    }

    const data = await response.json() as VulnerabilityResult
    return data
  } catch {
    return { vulnerable: false, vulnerabilities: [] }
  }
}
