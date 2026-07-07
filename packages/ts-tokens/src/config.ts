import type { TokenConfig, TokenOptions, SolanaNetwork } from './types'
import { loadConfig } from 'bunfig'
import { DEFAULT_RPC_ENDPOINTS, DEFAULT_EXPLORER_URLS } from './types'

/**
 * Default configuration values
 */
export const defaults: TokenConfig = {
  chain: 'solana',
  network: 'devnet',
  commitment: 'confirmed',
  verbose: false,
  dryRun: false,
  ipfsGateway: 'https://ipfs.io',
  arweaveGateway: 'https://arweave.net',
  storageProvider: 'arweave',
  securityChecks: true,
  autoCreateAccounts: true,
}

/**
 * Get RPC URL for a network
 */
export function getRpcUrl(network: SolanaNetwork, customUrl?: string): string {
  return customUrl || DEFAULT_RPC_ENDPOINTS[network]
}

/**
 * Get explorer URL for a network
 */
export function getExplorerUrl(network: SolanaNetwork, customUrl?: string): string {
  return customUrl || DEFAULT_EXPLORER_URLS[network]
}

/**
 * Merge user options with defaults
 */
export function mergeConfig(options: TokenOptions): TokenConfig {
  return {
    ...defaults,
    ...options,
    rpcUrl: options.rpcUrl || getRpcUrl(options.network || defaults.network),
    explorerUrl: options.explorerUrl || getExplorerUrl(options.network || defaults.network),
  }
}

// Lazy-loaded config to avoid top-level await (enables bun --compile)
let _config: TokenConfig | null = null

/**
 * Path to the persistent CLI config overlay. This is a JSON file that stores
 * changes made via `config:set`, `config:network`, `wallet:import`, etc. so
 * they survive across process invocations (unlike the in-memory `setConfig`).
 */
export function getConfigOverlayPath(): string {
  // Lazily required so browser bundles that never call this don't pull in `os`.
  // eslint-disable-next-line ts/no-require-imports
  const os = require('node:os')
  // eslint-disable-next-line ts/no-require-imports
  const path = require('node:path')
  return path.join(os.homedir(), '.ts-tokens', 'config.json')
}

/**
 * Read the persisted config overlay from disk. Returns an empty object if no
 * overlay exists or it can't be parsed.
 */
export function readConfigOverlay(): TokenOptions {
  try {
    // eslint-disable-next-line ts/no-require-imports
    const fs = require('node:fs')
    const overlayPath = getConfigOverlayPath()
    if (!fs.existsSync(overlayPath)) return {}
    return JSON.parse(fs.readFileSync(overlayPath, 'utf-8')) as TokenOptions
  } catch {
    return {}
  }
}

/**
 * Persist a config overlay to disk, deep-merging with any existing overlay.
 * Returns the merged overlay that was written.
 */
export function saveConfigOverlay(updates: TokenOptions): TokenOptions {
  // eslint-disable-next-line ts/no-require-imports
  const fs = require('node:fs')
  // eslint-disable-next-line ts/no-require-imports
  const path = require('node:path')
  const overlayPath = getConfigOverlayPath()
  const existing = readConfigOverlay()
  const merged = deepMerge(existing, updates)

  fs.mkdirSync(path.dirname(overlayPath), { recursive: true })
  fs.writeFileSync(overlayPath, `${JSON.stringify(merged, null, 2)}\n`)

  // Invalidate the in-memory cache so the next getConfig() picks up the change.
  _config = null
  return merged
}

/** Deep-merge plain objects (arrays and scalars are replaced, not merged). */
function deepMerge<T extends Record<string, any>>(base: T, overlay: Record<string, any>): T {
  const out: Record<string, any> = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    if (
      value && typeof value === 'object' && !Array.isArray(value)
      && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key], value)
    } else {
      out[key] = value
    }
  }
  return out as T
}

/**
 * Load configuration from file or use defaults, then apply the persisted
 * on-disk overlay (from `~/.ts-tokens/config.json`) so CLI edits survive
 * across processes.
 */
export async function getConfig(): Promise<TokenConfig> {
  if (!_config) {
    const loaded = await loadConfig({
      name: 'tokens',
      defaultConfig: defaults,
    })
    const overlay = readConfigOverlay()
    _config = mergeConfig(deepMerge(loaded as Record<string, any>, overlay))
  }
  return _config
}

/**
 * Set configuration programmatically (in-memory only, for the current process).
 * CLI commands that need persistence should use `saveConfigOverlay` instead.
 */
export function setConfig(options: TokenOptions): TokenConfig {
  _config = mergeConfig(options)
  return _config
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  _config = null
}

/**
 * Get current configuration (synchronous, returns cached or defaults)
 */
export function getCurrentConfig(): TokenConfig {
  return _config || mergeConfig({})
}

// For backwards compatibility - synchronous access with default fallback
export const config: TokenConfig = defaults
