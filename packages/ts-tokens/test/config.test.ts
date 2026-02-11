import { describe, test, expect, beforeEach } from 'bun:test'
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

beforeEach(() => {
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
