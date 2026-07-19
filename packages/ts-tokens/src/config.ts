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
  // Uploads go through Irys (ANS-104 data items signed by the Solana keypair).
  // Requires a keypair (wallet.keypairPath / TOKENS_KEYPAIR / ~/.config/solana/id.json)
  // and a funded Irys balance; adapter construction fails fast with an
  // actionable error when no keypair is available.
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
 * changes made via `config:set --global`, `config:network --global`,
 * `wallet:import`, etc. so they survive across process invocations (unlike
 * the in-memory `setConfig`).
 *
 * The `TOKENS_CONFIG_DIR` environment variable redirects the overlay directory
 * (used by tests and sandboxed runs to keep the real user home untouched).
 */
export function getConfigOverlayPath(): string {
  // Lazily required so browser bundles that never call this don't pull in `os`.
  // eslint-disable-next-line ts/no-require-imports
  const os = require('node:os')
  // eslint-disable-next-line ts/no-require-imports
  const path = require('node:path')
  const overrideDir = process.env.TOKENS_CONFIG_DIR
  if (overrideDir) return path.join(overrideDir, 'config.json')
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
 * Project config file candidates, in the same resolution order bunfig uses
 * (first match wins). Only the JSON variant is programmatically writable.
 */
const PROJECT_CONFIG_NAMES = [
  'tokens.config.ts',
  'tokens.config.js',
  'tokens.config.mjs',
  'tokens.config.cjs',
  'tokens.config.json',
]

/**
 * Find the project config file for a directory, following bunfig's resolution
 * order. Returns null when the directory has no tokens.config.* file.
 */
export function findProjectConfigPath(cwd: string = process.cwd()): string | null {
  // eslint-disable-next-line ts/no-require-imports
  const fs = require('node:fs')
  // eslint-disable-next-line ts/no-require-imports
  const path = require('node:path')
  for (const name of PROJECT_CONFIG_NAMES) {
    const candidate = path.join(cwd, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Persist config updates to the PROJECT config (tokens.config.json in `cwd`),
 * deep-merging with any existing content. This is the default target for
 * `config:set` / `config:network` so one project's edits no longer leak into
 * every other project via the user-level overlay.
 *
 * - When a tokens.config.json exists, it is updated in place.
 * - When no project config exists, tokens.config.json is created.
 * - When the project config is TypeScript/JavaScript, this throws — rewriting
 *   source files is unsafe. Edit the file directly or use `--global`.
 *
 * Returns the path written and the merged config.
 */
export function saveProjectConfig(
  updates: TokenOptions,
  cwd: string = process.cwd(),
): { path: string; config: Record<string, any> } {
  // eslint-disable-next-line ts/no-require-imports
  const fs = require('node:fs')
  // eslint-disable-next-line ts/no-require-imports
  const path = require('node:path')

  const existing = findProjectConfigPath(cwd)
  if (existing && !existing.endsWith('.json')) {
    throw new Error(
      `Project config is ${path.basename(existing)} — TypeScript/JavaScript configs ` +
      'cannot be rewritten safely. Edit that file directly, or re-run with --global ' +
      'to write the user-level config instead.',
    )
  }

  const target = existing ?? path.join(cwd, 'tokens.config.json')
  let current: Record<string, any> = {}
  if (fs.existsSync(target)) {
    try {
      current = JSON.parse(fs.readFileSync(target, 'utf-8'))
    } catch {
      throw new Error(`Cannot parse ${target} — fix or remove it and try again.`)
    }
  }

  const merged = deepMerge(current, updates as Record<string, any>)
  fs.writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`)

  // Invalidate the in-memory cache so the next getConfig() picks up the change.
  _config = null
  return { path: target, config: merged }
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
 * Get current configuration (synchronous).
 *
 * Returns the cached config once `getConfig()` (or `setConfig()`) has run.
 * Before that, performs a best-effort synchronous load — JSON project configs
 * and the persisted overlay are readable synchronously — instead of returning
 * bare defaults. TypeScript/JavaScript project configs can only be loaded
 * asynchronously; call `await getConfig()` when full fidelity is required.
 */
export function getCurrentConfig(): TokenConfig {
  if (_config) return _config

  let options: Record<string, any> = {}
  try {
    const projectPath = findProjectConfigPath()
    if (projectPath?.endsWith('.json')) {
      // eslint-disable-next-line ts/no-require-imports
      const fs = require('node:fs')
      options = JSON.parse(fs.readFileSync(projectPath, 'utf-8'))
    }
  } catch {
    options = {}
  }

  return mergeConfig(deepMerge(options, readConfigOverlay()))
}

// For backwards compatibility - synchronous access with default fallback
export const config: TokenConfig = defaults
