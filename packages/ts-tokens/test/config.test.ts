import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  getRpcUrl,
  getExplorerUrl,
  mergeConfig,
  setConfig,
  resetConfig,
  getCurrentConfig,
  defaults,
} from '../src/config'
import { DEFAULT_RPC_ENDPOINTS, DEFAULT_EXPLORER_URLS } from '../src/types'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

let savedConfigDir: string | undefined

beforeEach(() => {
  // Isolate the user-level overlay so the real ~/.ts-tokens/config.json can
  // never influence getCurrentConfig()/getConfig() in tests.
  savedConfigDir = process.env.TOKENS_CONFIG_DIR
  process.env.TOKENS_CONFIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-config-test-'))
  resetConfig()
})

afterEach(() => {
  if (savedConfigDir === undefined) {
    delete process.env.TOKENS_CONFIG_DIR
  } else {
    process.env.TOKENS_CONFIG_DIR = savedConfigDir
  }
  resetConfig()
})

describe('getRpcUrl', () => {
  test('returns default devnet URL', () => {
    expect(getRpcUrl('devnet')).toBe('https://api.devnet.solana.com')
  })

  test('returns default mainnet URL', () => {
    expect(getRpcUrl('mainnet-beta')).toBe('https://api.mainnet-beta.solana.com')
  })

  test('returns default testnet URL', () => {
    expect(getRpcUrl('testnet')).toBe('https://api.testnet.solana.com')
  })

  test('returns default localnet URL', () => {
    expect(getRpcUrl('localnet')).toBe('http://localhost:8899')
  })

  test('returns custom URL when provided', () => {
    expect(getRpcUrl('devnet', 'https://my-rpc.example.com')).toBe('https://my-rpc.example.com')
  })

  test('prefers custom URL over default', () => {
    const custom = 'https://custom-rpc.io'
    expect(getRpcUrl('mainnet-beta', custom)).toBe(custom)
  })
})

describe('getExplorerUrl', () => {
  test('returns default devnet explorer URL', () => {
    expect(getExplorerUrl('devnet')).toBe(DEFAULT_EXPLORER_URLS['devnet'])
  })

  test('returns default mainnet explorer URL', () => {
    expect(getExplorerUrl('mainnet-beta')).toBe(DEFAULT_EXPLORER_URLS['mainnet-beta'])
  })

  test('returns custom URL when provided', () => {
    expect(getExplorerUrl('devnet', 'https://solscan.io')).toBe('https://solscan.io')
  })
})

describe('mergeConfig', () => {
  test('returns defaults when given empty options', () => {
    const config = mergeConfig({})
    expect(config.chain).toBe('solana')
    expect(config.network).toBe('devnet')
    expect(config.commitment).toBe('confirmed')
  })

  test('overrides specific fields', () => {
    const config = mergeConfig({ network: 'mainnet-beta', verbose: true })
    expect(config.network).toBe('mainnet-beta')
    expect(config.verbose).toBe(true)
    expect(config.commitment).toBe('confirmed') // unchanged
  })

  test('derives rpcUrl from network', () => {
    const config = mergeConfig({ network: 'testnet' })
    expect(config.rpcUrl).toBe(DEFAULT_RPC_ENDPOINTS['testnet'])
  })

  test('uses provided rpcUrl over derived', () => {
    const config = mergeConfig({ rpcUrl: 'https://custom.rpc' })
    expect(config.rpcUrl).toBe('https://custom.rpc')
  })

  test('derives explorerUrl from network', () => {
    const config = mergeConfig({ network: 'mainnet-beta' })
    expect(config.explorerUrl).toBe(DEFAULT_EXPLORER_URLS['mainnet-beta'])
  })
})

describe('setConfig / getCurrentConfig / resetConfig', () => {
  test('setConfig updates current config', () => {
    setConfig({ network: 'mainnet-beta' })
    const config = getCurrentConfig()
    expect(config.network).toBe('mainnet-beta')
  })

  test('resetConfig clears cached config', () => {
    setConfig({ network: 'mainnet-beta' })
    resetConfig()
    const config = getCurrentConfig()
    expect(config.network).toBe('devnet') // back to default
  })

  test('getCurrentConfig returns defaults when no config set', () => {
    const config = getCurrentConfig()
    expect(config.chain).toBe('solana')
    expect(config.network).toBe('devnet')
  })

  test('setConfig returns the new config', () => {
    const config = setConfig({ verbose: true })
    expect(config.verbose).toBe(true)
  })
})

describe('defaults', () => {
  test('has expected default values', () => {
    expect(defaults.chain).toBe('solana')
    expect(defaults.network).toBe('devnet')
    expect(defaults.commitment).toBe('confirmed')
    expect(defaults.verbose).toBe(false)
    expect(defaults.dryRun).toBe(false)
    expect(defaults.securityChecks).toBe(true)
    expect(defaults.autoCreateAccounts).toBe(true)
    expect(defaults.storageProvider).toBe('arweave')
  })
})

describe('config overlay path & project config', () => {
  test('getConfigOverlayPath honors TOKENS_CONFIG_DIR', async () => {
    const { getConfigOverlayPath } = await import('../src/config')
    expect(getConfigOverlayPath()).toBe(path.join(process.env.TOKENS_CONFIG_DIR!, 'config.json'))
  })

  test('findProjectConfigPath finds tokens.config.* in bunfig order', async () => {
    const { findProjectConfigPath } = await import('../src/config')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-findcfg-'))
    expect(findProjectConfigPath(dir)).toBeNull()

    fs.writeFileSync(path.join(dir, 'tokens.config.json'), '{}')
    expect(findProjectConfigPath(dir)).toBe(path.join(dir, 'tokens.config.json'))

    // .ts wins over .json (bunfig resolution order)
    fs.writeFileSync(path.join(dir, 'tokens.config.ts'), 'export default {}')
    expect(findProjectConfigPath(dir)).toBe(path.join(dir, 'tokens.config.ts'))
  })

  test('saveProjectConfig creates tokens.config.json when none exists', async () => {
    const { saveProjectConfig } = await import('../src/config')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-saveproj-'))

    const { path: written, config } = saveProjectConfig({ network: 'testnet' }, dir)
    expect(written).toBe(path.join(dir, 'tokens.config.json'))
    expect(config.network).toBe('testnet')
    expect(JSON.parse(fs.readFileSync(written, 'utf-8')).network).toBe('testnet')
  })

  test('saveProjectConfig deep-merges into an existing JSON config', async () => {
    const { saveProjectConfig } = await import('../src/config')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-mergeproj-'))
    fs.writeFileSync(
      path.join(dir, 'tokens.config.json'),
      JSON.stringify({ network: 'devnet', wallet: { keypairPath: '/tmp/a.json' } }),
    )

    saveProjectConfig({ wallet: { keypairEnv: 'TOKENS_KEYPAIR' } }, dir)
    const written = JSON.parse(fs.readFileSync(path.join(dir, 'tokens.config.json'), 'utf-8'))
    expect(written.wallet.keypairEnv).toBe('TOKENS_KEYPAIR')
    expect(written.wallet.keypairPath).toBe('/tmp/a.json')
    expect(written.network).toBe('devnet')
  })

  test('saveProjectConfig refuses TypeScript/JavaScript project configs', async () => {
    const { saveProjectConfig } = await import('../src/config')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-tsproj-'))
    fs.writeFileSync(path.join(dir, 'tokens.config.ts'), 'export default {}')

    expect(() => saveProjectConfig({ network: 'testnet' }, dir)).toThrow('--global')
  })

  test('getCurrentConfig applies the overlay before getConfig() has run', async () => {
    const { saveConfigOverlay, getCurrentConfig } = await import('../src/config')
    saveConfigOverlay({ network: 'mainnet-beta' })
    expect(getCurrentConfig().network).toBe('mainnet-beta')
  })
})
