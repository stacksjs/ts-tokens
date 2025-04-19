import type { TokenxConfig } from './types'
import { loadConfig } from 'bunfig'

export const defaults: TokenxConfig = {
  verbose: true,
}

// eslint-disable-next-line antfu/no-top-level-await
export const config: TokenxConfig = await loadConfig({
  name: 'tokenx',
  defaultConfig: defaults,
})
