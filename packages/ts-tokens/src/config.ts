import type { SolanaNetwork, TokenConfig, TokenOptions } from './types'
import { loadConfig } from 'bunfig'
import { DEFAULT_EXPLORER_URLS, DEFAULT_RPC_ENDPOINTS } from './types'

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
 * Load configuration from file or use defaults
 */
export async function getConfig(): Promise<TokenConfig> {
  if (!_config) {
    const loaded = await loadConfig({
      name: 'tokens',
      defaultConfig: defaults,
    })
    _config = mergeConfig(loaded)
  }
  return _config
}

/**
 * Set configuration programmatically
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
