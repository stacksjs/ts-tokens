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
 * Register a chain driver factory
 */
export function registerDriver(chain: Chain, factory: DriverFactory): void {
  drivers.set(chain, factory)
}

/**
 * Get a driver instance for a chain
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
 * Check if a driver is registered for a chain
 */
export function hasDriver(chain: Chain): boolean {
  return drivers.has(chain)
}

/**
 * List all registered chains
 */
export function listDrivers(): Chain[] {
  return Array.from(drivers.keys()) as Chain[]
}

/**
 * Create a driver registry instance
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
 * Default driver registry
 */
export const driverRegistry: DriverRegistry = createDriverRegistry()

// Re-export driver types
export type { ChainDriver, DriverFactory, DriverRegistry }
