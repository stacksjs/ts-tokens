import type { TokenxConfig } from './types'
// @ts-expect-error there currently is a dtsx issue with bunfig so this is expected to error
import { loadConfig } from 'bunfig'

export const defaults: TokenxConfig = {
  verbose: true,
}

// Lazy-loaded config to avoid top-level await (enables bun --compile)
let _config: TokenxConfig | null = null

export async function getConfig(): Promise<TokenxConfig> {
  if (!_config) {
    _config = await loadConfig({
  name: 'tokenx',
  defaultConfig: defaults,
})
  }
  return _config
}

// For backwards compatibility - synchronous access with default fallback
export const config: TokenxConfig = defaultConfig
