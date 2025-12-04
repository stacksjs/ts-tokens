/**
 * Solana Driver
 *
 * Main entry point for the Solana blockchain driver.
 */

export * from './connection'
export * from './wallet'
export * from './transaction'
export * from './account'

// Re-export for convenience
export { SolanaConnection, createSolanaConnection } from './connection'
export { createWallet, loadWallet, generateKeypair } from './wallet'
export {
  buildTransaction,
  sendAndConfirmTransaction,
  simulateTransaction,
  estimatePriorityFee,
} from './transaction'
export {
  getAccountInfo,
  getMultipleAccounts,
  getBalance,
  getTokenBalance,
  getTokenAccounts,
  getNFTAccounts,
  getMintInfo,
  getLargestTokenHolders,
} from './account'
