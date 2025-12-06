/**
 * Solana Driver
 *
 * Main entry point for the Solana blockchain driver.
 */

export * from './account'
export {
  getAccountInfo,
  getBalance,
  getLargestTokenHolders,
  getMintInfo,
  getMultipleAccounts,
  getNFTAccounts,
  getTokenAccounts,
  getTokenBalance,
} from './account'
export * from './connection'
// Re-export for convenience
export { createSolanaConnection, SolanaConnection } from './connection'

export * from './transaction'
export {
  buildTransaction,
  estimatePriorityFee,
  sendAndConfirmTransaction,
  simulateTransaction,
} from './transaction'
export * from './wallet'
export { createWallet, generateKeypair, loadWallet } from './wallet'
