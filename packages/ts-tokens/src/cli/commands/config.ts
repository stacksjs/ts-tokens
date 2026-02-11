/** CLI config command handlers. */

import { success, error, header, keyValue, info } from '../utils'
import { getConfig, setConfig } from '../../config'
import type { SolanaNetwork } from '../../types'

const VALID_NETWORKS = ['mainnet-beta', 'devnet', 'testnet', 'localnet']

export async function configInit(options: { network?: string }): Promise<void> {
  const network = options.network || 'devnet'
  info(`Initializing tokens configuration...`)
  keyValue('Network', network)
  info('Create a tokens.config.ts file in your project root.')
  info('See https://ts-tokens.dev/config for all options.')
  success('Config initialized')
}

export async function configShow(): Promise<void> {
  const config = await getConfig()
  header('Current Configuration')
  for (const [k, v] of Object.entries(config)) {
    keyValue(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
  }
}

export async function configNetwork(network: string): Promise<void> {
  if (!VALID_NETWORKS.includes(network)) {
    error(`Invalid network: ${network}`)
    error(`Valid networks: ${VALID_NETWORKS.join(', ')}`)
    process.exit(1)
  }
  setConfig({ network: network as SolanaNetwork })
  success(`Switched to ${network}`)
}

export async function configSet(key: string, value: string): Promise<void> {
  try {
    const updates: Record<string, any> = {}
    const keys = key.split('.')

    if (keys.length === 1) {
      if (value === 'true') updates[key] = true
      else if (value === 'false') updates[key] = false
      else if (!isNaN(Number(value))) updates[key] = Number(value)
      else updates[key] = value
    } else {
      let obj: Record<string, any> = updates
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = {}
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
    }

    setConfig(updates)
    success(`Set ${key} = ${value}`)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function configGet(key: string): Promise<void> {
  try {
    const config = await getConfig()
    const keys = key.split('.')
    let value: any = config

    for (const k of keys) {
      value = value?.[k as keyof typeof value]
    }

    if (value === undefined) {
      keyValue(key, '(not set)')
    } else {
      keyValue(key, typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
