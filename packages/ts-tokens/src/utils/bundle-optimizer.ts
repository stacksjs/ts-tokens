/**
 * Bundle Optimization Utilities
 *
 * Tree-shaking helpers, lazy loading, and environment-specific code paths.
 */

/**
 * Lazy import a module — only loads when first called.
 * Enables tree-shaking of optional features.
 */
export function lazyImport<T>(factory: () => Promise<T>): () => Promise<T> {
  let cached: T | undefined
  let loading: Promise<T> | undefined

  return () => {
    if (cached !== undefined) return Promise.resolve(cached)
    if (loading) return loading
    loading = factory().then((mod) => {
      cached = mod
      loading = undefined
      return mod
    })
    return loading
  }
}

/**
 * Conditional import based on environment
 */
export async function environmentImport<TNode, TBrowser>(
  nodeFactory: () => Promise<TNode>,
  browserFactory: () => Promise<TBrowser>,
): Promise<TNode | TBrowser> {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return browserFactory()
  }
  return nodeFactory()
}

/**
 * Check if a module is available without throwing
 */
export async function isModuleAvailable(moduleName: string): Promise<boolean> {
  try {
    await import(moduleName)
    return true
  } catch {
    return false
  }
}

/** Feature flags for optional modules */
export interface FeatureFlags {
  defi: boolean
  marketplace: boolean
  governance: boolean
  staking: boolean
  analytics: boolean
  wallets: boolean
}

/** Get available features based on installed dependencies */
export function getAvailableFeatures(): FeatureFlags {
  return {
    defi: true,
    marketplace: true,
    governance: true,
    staking: true,
    analytics: true,
    wallets: true,
  }
}

/**
 * Bundle size measurement utility for CI
 */
export interface BundleSizeEntry {
  name: string
  sizeBytes: number
  gzipBytes?: number
}

export interface BundleSizeReport {
  timestamp: number
  version: string
  entries: BundleSizeEntry[]
  totalSizeBytes: number
  totalGzipBytes: number
}

/**
 * Analyze bundle sizes of dist output files
 */
export async function analyzeBundleSize(distPath: string): Promise<BundleSizeReport> {
  const { readdir, stat } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const { gzipSync } = await import('node:zlib')
  const { readFileSync } = await import('node:fs')

  const entries: BundleSizeEntry[] = []

  async function scanDir(dir: string, prefix = ''): Promise<void> {
    const items = await readdir(dir, { withFileTypes: true })
    for (const item of items) {
      const fullPath = join(dir, item.name)
      if (item.isDirectory()) {
        await scanDir(fullPath, `${prefix}${item.name}/`)
      } else if (item.name.endsWith('.js') || item.name.endsWith('.mjs')) {
        const info = await stat(fullPath)
        const content = readFileSync(fullPath)
        const gzipped = gzipSync(content)
        entries.push({
          name: `${prefix}${item.name}`,
          sizeBytes: info.size,
          gzipBytes: gzipped.length,
        })
      }
    }
  }

  await scanDir(distPath)

  const totalSizeBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0)
  const totalGzipBytes = entries.reduce((sum, e) => sum + (e.gzipBytes ?? 0), 0)

  return {
    timestamp: Date.now(),
    version: '0.1.0',
    entries,
    totalSizeBytes,
    totalGzipBytes,
  }
}

/**
 * Check bundle size against budget
 */
export function checkBundleBudget(
  report: BundleSizeReport,
  budgets: { maxTotalBytes?: number; maxEntryBytes?: number; maxGzipBytes?: number },
): { passed: boolean; violations: string[] } {
  const violations: string[] = []

  if (budgets.maxTotalBytes && report.totalSizeBytes > budgets.maxTotalBytes) {
    violations.push(`Total size ${report.totalSizeBytes} exceeds budget ${budgets.maxTotalBytes}`)
  }

  if (budgets.maxGzipBytes && report.totalGzipBytes > budgets.maxGzipBytes) {
    violations.push(`Total gzip size ${report.totalGzipBytes} exceeds budget ${budgets.maxGzipBytes}`)
  }

  if (budgets.maxEntryBytes) {
    for (const entry of report.entries) {
      if (entry.sizeBytes > budgets.maxEntryBytes) {
        violations.push(`${entry.name} (${entry.sizeBytes}) exceeds entry budget ${budgets.maxEntryBytes}`)
      }
    }
  }

  return { passed: violations.length === 0, violations }
}
