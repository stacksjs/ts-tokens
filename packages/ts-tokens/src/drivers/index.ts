/**
 * Chain Driver Registry
 *
 * Manages blockchain driver implementations and provides factory functions.
 */

import type { ChainDriver, DriverFactory, DriverRegistry } from '../types'
import type { TokenConfig, Chain } from '../types'
import { SolanaDriver } from './solana/driver'

// Export Solana driver
export * from './solana'

/**
 * Internal driver registry
 */
const drivers = new Map<string, DriverFactory>()

/**
 * Register a chain driver factory.
 *
 * @param chain - The chain identifier (e.g., 'solana')
 * @param factory - Factory function that creates a ChainDriver from config
 *
 * @example
 * ```ts
 * registerDriver('solana', (config) => new SolanaDriver(config))
 * ```
 */
export function registerDriver(chain: Chain, factory: DriverFactory): void {
  drivers.set(chain, factory)
}

/**
 * Get a driver instance for a chain.
 *
 * @param chain - The chain identifier to look up
 * @param config - ts-tokens configuration passed to the driver factory
 * @returns An instantiated ChainDriver
 * @throws If no driver is registered for the given chain
 *
 * @example
 * ```ts
 * const driver = getDriver('solana', config)
 * ```
 */
export function getDriver(chain: Chain, config: TokenConfig): ChainDriver {
  const factory = drivers.get(chain)
  if (!factory) {
    throw new Error(
      `No driver registered for chain "${chain}". ` +
      `Available chains: ${Array.from(drivers.keys()).join(', ') || 'none'}`
    )
  }
  return factory(config)
}

/**
 * Check if a driver is registered for a chain.
 *
 * @param chain - The chain identifier to check
 * @returns True if a driver factory is registered for this chain
 */
export function hasDriver(chain: Chain): boolean {
  return drivers.has(chain)
}

/**
 * List all registered chain identifiers.
 *
 * @returns Array of chain names with registered drivers
 */
export function listDrivers(): Chain[] {
  return Array.from(drivers.keys()) as Chain[]
}

/**
 * Create a new, independent driver registry instance.
 *
 * The returned registry has its OWN backing map: registering a driver in one
 * instance does not affect the module-level registry or any other instance.
 *
 * @returns A DriverRegistry with register, get, has, and list methods
 *
 * @example
 * ```ts
 * const registry = createDriverRegistry()
 * registry.register('solana', (cfg) => new SolanaDriver(cfg))
 * ```
 */
export function createDriverRegistry(): DriverRegistry {
  const registryDrivers = new Map<string, DriverFactory>()
  return {
    register: (chain: string, factory: DriverFactory) => {
      registryDrivers.set(chain, factory)
    },
    get: (chain: string, config: TokenConfig) => {
      const factory = registryDrivers.get(chain)
      if (!factory) {
        throw new Error(`No driver registered for chain "${chain}"`)
      }
      return factory(config)
    },
    has: (chain: string) => registryDrivers.has(chain),
    list: () => Array.from(registryDrivers.keys()),
  }
}

/**
 * Auto-detect and return the appropriate driver based on config
 *
 * Reads `config.chain` and resolves the matching driver from the registry.
 * Currently only 'solana' is supported, but this function provides a
 * forward-compatible entry point for multi-chain support.
 *
 * @param config - Token configuration with chain field
 * @returns Instantiated chain driver
 * @throws If no driver is registered for the configured chain
 */
export function autoDetectDriver(config: TokenConfig): ChainDriver {
  const chain = config.chain || 'solana'

  if (!drivers.has(chain)) {
    throw new Error(
      `No driver registered for chain "${chain}". ` +
      `Available chains: ${Array.from(drivers.keys()).join(', ') || 'none'}. ` +
      `Register a driver with registerDriver() first.`
    )
  }

  return getDriver(chain, config)
}

/**
 * Default driver registry
 */
export const driverRegistry: DriverRegistry = createDriverRegistry()

// Register the built-in Solana driver so getDriver(), autoDetectDriver(), and
// the default registry work out of the box. Other chains register their own
// factories with registerDriver().
const solanaFactory: DriverFactory = (config: TokenConfig) => new SolanaDriver(config)
registerDriver('solana', solanaFactory)
driverRegistry.register('solana', solanaFactory)

// Re-export driver types
export type { ChainDriver, DriverFactory, DriverRegistry }
