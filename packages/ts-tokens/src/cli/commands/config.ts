/** CLI config command handlers. */

import { success, error, header, keyValue, info } from '../utils'
import { getConfig, saveConfigOverlay, getConfigOverlayPath } from '../../config'
import type { SolanaNetwork } from '../../types'

const VALID_NETWORKS = ['mainnet-beta', 'devnet', 'testnet', 'localnet']

export async function configInit(options: { network?: string }): Promise<void> {
  const network = options.network || 'devnet'

  if (!VALID_NETWORKS.includes(network)) {
    error(`Invalid network: ${network}`)
    error(`Valid networks: ${VALID_NETWORKS.join(', ')}`)
    process.exit(1)
  }

  try {
    const fs = await import('node:fs')
    const path = await import('node:path')

    const target = path.resolve('tokens.config.json')
    // A project may already be configured via any of these files (bunfig
    // resolves several extensions). If one exists, don't clobber or duplicate it.
    const existing = ['tokens.config.ts', 'tokens.config.js', 'tokens.config.json', 'tokens.config.mjs']
      .map(f => path.resolve(f))
      .find(p => fs.existsSync(p))

    info(`Initializing tokens configuration...`)
    keyValue('Network', network)
    keyValue('Config file', existing ?? target)

    if (existing) {
      info('Config file already exists; leaving it unchanged.')
      info('Edit this file or run `tokens config:set <key> <value>` to change settings.')
      success('Config already initialized')
      return
    }

    const starter = {
      network,
      commitment: 'confirmed',
      storageProvider: 'arweave',
      wallet: {
        keypairPath: '~/.config/solana/id.json',
      },
    }

    fs.writeFileSync(target, `${JSON.stringify(starter, null, 2)}\n`)

    info('Edit this file or run `tokens config:set <key> <value>` to change settings.')
    success('Config initialized')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
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
  saveConfigOverlay({ network: network as SolanaNetwork })
  success(`Switched to ${network}`)
  info(`Persisted to ${getConfigOverlayPath()}`)
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

    saveConfigOverlay(updates)
    success(`Set ${key} = ${value}`)
    info(`Persisted to ${getConfigOverlayPath()}`)
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
