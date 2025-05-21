import type { TokenxConfig } from './types'
// @ts-expect-error there currently is a dtsx issue with bunfig so this is expected to error
import { loadConfig } from 'bunfig'

export const defaults: TokenxConfig = {
  verbose: true,
}

// eslint-disable-next-line antfu/no-top-level-await
export const config: TokenxConfig = await loadConfig({
  name: 'tokenx',
  defaultConfig: defaults,
})
