/**
 * Chain Driver Registry
 *
 * Manages blockchain driver implementations and provides factory functions.
 */

import type { ChainDriver, DriverFactory, DriverRegistry } from '../types'
import type { TokenConfig, Chain } from '../types'

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
 * @returns A DriverRegistry with register, get, has, and list methods
 *
 * @example
 * ```ts
 * const registry = createDriverRegistry()
 * registry.register('solana', (cfg) => new SolanaDriver(cfg))
 * ```
 */
export function createDriverRegistry(): DriverRegistry {
  return {
    register: (chain: string, factory: DriverFactory) => {
      drivers.set(chain, factory)
    },
    get: (chain: string, config: TokenConfig) => {
      const factory = drivers.get(chain)
      if (!factory) {
        throw new Error(`No driver registered for chain "${chain}"`)
      }
      return factory(config)
    },
    has: (chain: string) => drivers.has(chain),
    list: () => Array.from(drivers.keys()),
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

// Re-export driver types
export type { ChainDriver, DriverFactory, DriverRegistry }
