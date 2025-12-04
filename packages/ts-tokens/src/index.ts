/**
 * ts-tokens
 *
 * A TypeScript library for managing fungible and non-fungible tokens on Solana.
 * Zero external dependencies beyond official Solana packages.
 *
 * @packageDocumentation
 */

// Types (export first to avoid conflicts)
export * from './types'

// Configuration (some functions may shadow type exports)
export {
  defaults,
  getConfig,
  setConfig,
  resetConfig,
  getCurrentConfig,
  mergeConfig,
  config,
} from './config'

// Utilities
export * from './utils'

// Drivers (export specific items to avoid conflicts)
export {
  registerDriver,
  getDriver,
  hasDriver,
  listDrivers,
  createDriverRegistry,
  driverRegistry,
  // Solana driver exports
  SolanaConnection,
  createSolanaConnection,
  createWallet,
  loadWallet,
  generateKeypair,
  buildTransaction,
  sendAndConfirmTransaction,
  simulateTransaction,
  estimatePriorityFee,
} from './drivers'
