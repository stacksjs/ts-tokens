/**
 * Phishing & Scam Detection
 *
 * Checks for common phishing patterns, fake tokens, and drainer attacks.
 */

import type { SecurityCheckResult } from './checks'

/**
 * Check for unlimited approval amounts
 */
export function checkUnlimitedApproval(amount: bigint, balance: bigint): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (amount > balance * 100n) {
    warnings.push('Approval amount is far greater than current balance — potential unlimited approval')
    recommendations.push('Only approve the exact amount needed for the operation')
  }

  const MAX_U64 = (1n << 64n) - 1n
  if (amount === MAX_U64) {
    warnings.push('Unlimited token approval detected')
    recommendations.push('Avoid unlimited approvals — approve only the needed amount')
  }

  return { safe: amount <= balance * 10n, warnings, recommendations }
}

/**
 * Check for suspicious approval patterns
 */
export function checkSuspiciousApprovalPattern(approvals: Array<{ delegate: string; amount: bigint; timestamp: number }>): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check for many approvals in short time
  if (approvals.length > 5) {
    const timeSpan = approvals[approvals.length - 1].timestamp - approvals[0].timestamp
    if (timeSpan < 300) {
      warnings.push('Multiple approvals in a short time span — possible drainer interaction')
      recommendations.push('Review all recent approvals and revoke any that are suspicious')
    }
  }

  // Check for approvals to same delegate
  const delegates = new Map<string, number>()
  for (const a of approvals) {
    delegates.set(a.delegate, (delegates.get(a.delegate) ?? 0) + 1)
  }
  for (const [delegate, count] of delegates) {
    if (count > 3) {
      warnings.push(`Multiple approvals to delegate ${delegate}`)
    }
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check active approval count
 */
export function checkActiveApprovals(approvals: Array<{ delegate: string; amount: bigint }>): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const activeCount = approvals.filter(a => a.amount > 0n).length
  if (activeCount > 10) {
    warnings.push(`${activeCount} active token approvals — consider revoking unused ones`)
    recommendations.push('Regularly review and revoke unnecessary token approvals')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check for fake token names impersonating known tokens
 */
export function checkFakeTokenName(name: string, symbol: string, knownTokens: Array<{ name: string; symbol: string; mint: string }>): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  for (const known of knownTokens) {
    if (name.toLowerCase() === known.name.toLowerCase() || symbol.toLowerCase() === known.symbol.toLowerCase()) {
      warnings.push(`Token name/symbol matches known token "${known.name}" (${known.symbol}) — may be a fake`)
      recommendations.push(`Verify the mint address matches the official ${known.symbol} mint: ${known.mint}`)
    }
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check token against a registry
 */
export function checkTokenRegistry(mint: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Placeholder for registry check
  recommendations.push('Verify the token is listed on a trusted registry (e.g. Jupiter strict list)')

  return { safe: true, warnings, recommendations }
}

/**
 * Check for similar names (typosquatting)
 */
export function checkSimilarNames(name: string, knownNames: string[]): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const known of knownNames) {
    const knownNorm = known.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normalized !== knownNorm && levenshtein(normalized, knownNorm) <= 2) {
      warnings.push(`Name "${name}" is very similar to known token "${known}" — possible typosquatting`)
      recommendations.push('Verify this is the intended token and not an impersonator')
    }
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check for malicious metadata URIs
 */
export function checkMaliciousMetadataUri(uri: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const suspiciousPatterns = [/javascript:/i, /data:/i, /<script/i, /onclick/i, /onerror/i]
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(uri)) {
      warnings.push('Metadata URI contains potentially malicious content')
      recommendations.push('Do not interact with this token')
      return { safe: false, warnings, recommendations }
    }
  }

  if (uri.includes('..') || uri.includes('%2e%2e')) {
    warnings.push('Metadata URI contains path traversal patterns')
    return { safe: false, warnings, recommendations: ['Avoid interacting with this token'] }
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check for redirect chains in URIs
 */
export async function checkRedirectChain(uri: string): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  try {
    const response = await fetch(uri, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (location) {
        warnings.push(`URI redirects to: ${location}`)
        if (new URL(location).hostname !== new URL(uri).hostname) {
          warnings.push('Redirect goes to a different domain — suspicious')
          recommendations.push('Be cautious of cross-domain redirects in metadata URIs')
        }
      }
    }
  } catch {
    // Network error — not a phishing concern itself
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check for hidden Unicode characters in names
 */
export function checkHiddenCharacters(name: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check for zero-width characters, RTL override, etc.
  const hiddenChars = /[\u200B\u200C\u200D\uFEFF\u2060\u202A-\u202E\u2066-\u2069]/
  if (hiddenChars.test(name)) {
    warnings.push('Token name contains hidden Unicode characters — possible spoofing')
    recommendations.push('Hidden characters can make a token name appear identical to another')
  }

  // Check for mixed scripts (e.g. Cyrillic "а" vs Latin "a")
  const hasCyrillic = /[\u0400-\u04FF]/.test(name)
  const hasLatin = /[a-zA-Z]/.test(name)
  if (hasCyrillic && hasLatin) {
    warnings.push('Token name mixes Latin and Cyrillic characters — possible homograph attack')
    recommendations.push('Mixed-script names are a common spoofing technique')
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check external links in NFT metadata
 */
export function checkExternalNFTLinks(metadata: { external_url?: string; animation_url?: string }): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  for (const [key, url] of Object.entries(metadata)) {
    if (!url) continue
    if (url.startsWith('javascript:') || url.startsWith('data:')) {
      warnings.push(`${key} contains a potentially malicious URI scheme`)
      recommendations.push('Do not click links from untrusted NFTs')
    }
  }

  return { safe: warnings.length === 0, warnings, recommendations }
}

/**
 * Check for known drainer patterns in instructions
 */
export function checkDrainerPattern(instructions: Array<{ programId: string; data?: string }>): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check for multiple approve + transfer patterns
  const approveCount = instructions.filter(ix =>
    ix.data && ix.data.startsWith('04') // SPL Token approve instruction
  ).length

  if (approveCount > 2) {
    warnings.push('Multiple token approval instructions detected — possible drainer pattern')
    recommendations.push('Review each approval carefully before signing')
  }

  return { safe: approveCount <= 2, warnings, recommendations }
}

/**
 * Check address against known scam database
 */
export function checkKnownScamDatabase(address: string): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Placeholder — in production, check against an API or local database
  recommendations.push('Cross-reference addresses with known scam databases')

  return { safe: true, warnings, recommendations }
}

// Simple Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}
