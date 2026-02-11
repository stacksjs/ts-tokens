import { describe, test, expect, beforeEach } from 'bun:test'
import {
  defaults,
  mergeConfig,
  setConfig,
  resetConfig,
  getCurrentConfig,
} from '../../src/config'
import type { SolanaNetwork } from '../../src/types'
import { DEFAULT_RPC_ENDPOINTS, DEFAULT_EXPLORER_URLS } from '../../src/types'

describe('Config Lifecycle — Integration', () => {
  beforeEach(() => {
    resetConfig()
  })

  // ---------------------------------------------------------------------------
  // 1. Config Lifecycle (4 tests)
  // ---------------------------------------------------------------------------

  describe('Config Lifecycle', () => {
    test('full lifecycle: defaults -> setConfig -> verify -> resetConfig -> verify defaults restored', () => {
      // Step 1: Verify initial state matches defaults
      const initial = getCurrentConfig()
      expect(initial.network).toBe('devnet')
      expect(initial.chain).toBe('solana')
      expect(initial.verbose).toBe(false)

      // Step 2: Apply custom configuration
      const customized = setConfig({
        network: 'mainnet-beta',
        verbose: true,
        commitment: 'finalized',
        storageProvider: 'ipfs',
      })
      expect(customized.network).toBe('mainnet-beta')
      expect(customized.verbose).toBe(true)
      expect(customized.commitment).toBe('finalized')
      expect(customized.storageProvider).toBe('ipfs')

      // Step 3: Verify getCurrentConfig reflects the same state
      const current = getCurrentConfig()
      expect(current.network).toBe('mainnet-beta')
      expect(current.verbose).toBe(true)
      expect(current.commitment).toBe('finalized')
      expect(current.storageProvider).toBe('ipfs')

      // Step 4: Reset and verify defaults are fully restored
      resetConfig()
      const restored = getCurrentConfig()
      expect(restored.network).toBe(defaults.network)
      expect(restored.chain).toBe(defaults.chain)
      expect(restored.verbose).toBe(defaults.verbose)
      expect(restored.commitment).toBe(defaults.commitment)
      expect(restored.storageProvider).toBe(defaults.storageProvider)
      expect(restored.dryRun).toBe(defaults.dryRun)
      expect(restored.securityChecks).toBe(defaults.securityChecks)
      expect(restored.autoCreateAccounts).toBe(defaults.autoCreateAccounts)
    })

    test('multiple sequential setConfig calls maintain latest state', () => {
      setConfig({ network: 'mainnet-beta' })
      expect(getCurrentConfig().network).toBe('mainnet-beta')

      setConfig({ network: 'testnet', verbose: true })
      expect(getCurrentConfig().network).toBe('testnet')
      expect(getCurrentConfig().verbose).toBe(true)

      // Third call completely replaces — previous verbose: true is gone because
      // setConfig merges the new options with defaults, not with the previous config
      setConfig({ network: 'localnet' })
      const final = getCurrentConfig()
      expect(final.network).toBe('localnet')
      expect(final.verbose).toBe(false) // reverted to default
      expect(final.rpcUrl).toBe(DEFAULT_RPC_ENDPOINTS['localnet'])
    })

    test('setConfig with partial options preserves other defaults', () => {
      // Only set verbose — everything else should stay at defaults
      const config = setConfig({ verbose: true })

      expect(config.verbose).toBe(true)
      expect(config.chain).toBe(defaults.chain)
      expect(config.network).toBe(defaults.network)
      expect(config.commitment).toBe(defaults.commitment)
      expect(config.dryRun).toBe(defaults.dryRun)
      expect(config.ipfsGateway).toBe(defaults.ipfsGateway)
      expect(config.arweaveGateway).toBe(defaults.arweaveGateway)
      expect(config.storageProvider).toBe(defaults.storageProvider)
      expect(config.securityChecks).toBe(defaults.securityChecks)
      expect(config.autoCreateAccounts).toBe(defaults.autoCreateAccounts)
      // Derived URLs should match the default network
      expect(config.rpcUrl).toBe(DEFAULT_RPC_ENDPOINTS[defaults.network])
      expect(config.explorerUrl).toBe(DEFAULT_EXPLORER_URLS[defaults.network])
    })

    test('getCurrentConfig after reset matches mergeConfig({})', () => {
      // Apply a non-trivial config first so we know reset actually clears it
      setConfig({ network: 'mainnet-beta', verbose: true, dryRun: true })
      resetConfig()

      const fromGetCurrent = getCurrentConfig()
      const fromMerge = mergeConfig({})

      // Every field should be identical
      expect(fromGetCurrent.chain).toBe(fromMerge.chain)
      expect(fromGetCurrent.network).toBe(fromMerge.network)
      expect(fromGetCurrent.commitment).toBe(fromMerge.commitment)
      expect(fromGetCurrent.verbose).toBe(fromMerge.verbose)
      expect(fromGetCurrent.dryRun).toBe(fromMerge.dryRun)
      expect(fromGetCurrent.ipfsGateway).toBe(fromMerge.ipfsGateway)
      expect(fromGetCurrent.arweaveGateway).toBe(fromMerge.arweaveGateway)
      expect(fromGetCurrent.storageProvider).toBe(fromMerge.storageProvider)
      expect(fromGetCurrent.securityChecks).toBe(fromMerge.securityChecks)
      expect(fromGetCurrent.autoCreateAccounts).toBe(fromMerge.autoCreateAccounts)
      expect(fromGetCurrent.rpcUrl ?? '').toBe(fromMerge.rpcUrl ?? '')
      expect(fromGetCurrent.explorerUrl ?? '').toBe(fromMerge.explorerUrl ?? '')
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Network Resolution Lifecycle (3 tests)
  // ---------------------------------------------------------------------------

  describe('Network Resolution Lifecycle', () => {
    test('switch networks: devnet -> mainnet -> testnet -> localnet with correct RPC and explorer URLs at each step', () => {
      const networks: SolanaNetwork[] = ['devnet', 'mainnet-beta', 'testnet', 'localnet']

      for (const network of networks) {
        setConfig({ network })
        const config = getCurrentConfig()

        expect(config.network).toBe(network)
        expect(config.rpcUrl).toBe(DEFAULT_RPC_ENDPOINTS[network])
        expect(config.explorerUrl).toBe(DEFAULT_EXPLORER_URLS[network])
      }
    })

    test('custom RPC URL survives network switch only if explicitly set again', () => {
      const customRpc = 'https://my-private-rpc.example.com'

      // Set devnet with a custom RPC URL
      setConfig({ network: 'devnet', rpcUrl: customRpc })
      expect(getCurrentConfig().rpcUrl).toBe(customRpc)
      expect(getCurrentConfig().network).toBe('devnet')

      // Switch to mainnet without re-specifying the custom RPC — it should NOT survive
      // because setConfig merges options with defaults, not with previous config
      setConfig({ network: 'mainnet-beta' })
      expect(getCurrentConfig().rpcUrl).toBe(DEFAULT_RPC_ENDPOINTS['mainnet-beta'])

      // Re-set with custom RPC explicitly on the new network — now it persists
      setConfig({ network: 'mainnet-beta', rpcUrl: customRpc })
      expect(getCurrentConfig().rpcUrl).toBe(customRpc)
      expect(getCurrentConfig().network).toBe('mainnet-beta')
    })

    test('network switch updates derived URLs automatically', () => {
      // Start on devnet (the default)
      const devnetConfig = getCurrentConfig()
      expect(devnetConfig.rpcUrl).toBe(DEFAULT_RPC_ENDPOINTS['devnet'])
      expect(devnetConfig.explorerUrl).toBe(DEFAULT_EXPLORER_URLS['devnet'])

      // Switch to testnet — URLs should derive from the new network, not linger
      setConfig({ network: 'testnet' })
      const testnetConfig = getCurrentConfig()
      expect(testnetConfig.rpcUrl).toBe(DEFAULT_RPC_ENDPOINTS['testnet'])
      expect(testnetConfig.explorerUrl).toBe(DEFAULT_EXPLORER_URLS['testnet'])

      // Derived URLs should be different from the previous network
      expect(testnetConfig.rpcUrl).not.toBe(devnetConfig.rpcUrl)
      expect(testnetConfig.explorerUrl).not.toBe(devnetConfig.explorerUrl)
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Feature Flag Lifecycle (3 tests)
  // ---------------------------------------------------------------------------

  describe('Feature Flag Lifecycle', () => {
    test('dryRun flag: set true -> verify -> set false -> verify', () => {
      // Default should be false
      expect(getCurrentConfig().dryRun).toBe(false)

      // Enable dry run
      setConfig({ dryRun: true })
      expect(getCurrentConfig().dryRun).toBe(true)

      // The rest of the config should still be at defaults
      expect(getCurrentConfig().network).toBe(defaults.network)
      expect(getCurrentConfig().verbose).toBe(defaults.verbose)

      // Disable dry run explicitly
      setConfig({ dryRun: false })
      expect(getCurrentConfig().dryRun).toBe(false)
    })

    test('securityChecks: toggle on/off across operations', () => {
      // Default is true
      expect(getCurrentConfig().securityChecks).toBe(true)

      // Disable security checks
      setConfig({ securityChecks: false })
      expect(getCurrentConfig().securityChecks).toBe(false)

      // Other defaults untouched
      expect(getCurrentConfig().autoCreateAccounts).toBe(true)
      expect(getCurrentConfig().commitment).toBe('confirmed')

      // Re-enable security checks
      setConfig({ securityChecks: true })
      expect(getCurrentConfig().securityChecks).toBe(true)

      // Reset and verify it returns to default (true)
      resetConfig()
      expect(getCurrentConfig().securityChecks).toBe(true)
    })

    test('combined flags: verbose + dryRun + custom network in single setConfig', () => {
      const config = setConfig({
        verbose: true,
        dryRun: true,
        network: 'mainnet-beta',
        commitment: 'finalized',
        securityChecks: false,
        storageProvider: 'ipfs',
      })

      // All flags applied simultaneously
      expect(config.verbose).toBe(true)
      expect(config.dryRun).toBe(true)
      expect(config.network).toBe('mainnet-beta')
      expect(config.commitment).toBe('finalized')
      expect(config.securityChecks).toBe(false)
      expect(config.storageProvider).toBe('ipfs')

      // Derived URLs match the chosen network
      expect(config.rpcUrl).toBe(DEFAULT_RPC_ENDPOINTS['mainnet-beta'])
      expect(config.explorerUrl).toBe(DEFAULT_EXPLORER_URLS['mainnet-beta'])

      // Unset fields remain at defaults
      expect(config.chain).toBe('solana')
      expect(config.ipfsGateway).toBe(defaults.ipfsGateway)
      expect(config.arweaveGateway).toBe(defaults.arweaveGateway)
      expect(config.autoCreateAccounts).toBe(true)

      // getCurrentConfig agrees
      const current = getCurrentConfig()
      expect(current.verbose).toBe(true)
      expect(current.dryRun).toBe(true)
      expect(current.network).toBe('mainnet-beta')
    })
  })
})
