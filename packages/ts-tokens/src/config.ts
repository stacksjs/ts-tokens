import type { TokenConfig } from './types'
import { loadConfig } from 'bunfig'

export const defaults: TokenConfig = {
  verbose: true,
}

// Lazy-loaded config to avoid top-level await (enables bun --compile)
let _config: TokenConfig | null = null

export async function getConfig(): Promise<TokenConfig> {
  if (!_config) {
    _config = await loadConfig({
      name: 'tokenx',
      defaultConfig: defaults,
    })
  }
  return _config
}

// For backwards compatibility - synchronous access with default fallback
export const config: TokenConfig = defaults
