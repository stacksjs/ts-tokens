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
  autoDetectDriver,
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
  // Account utilities
  getAccountInfo,
  getMultipleAccounts,
  getBalance,
  getTokenBalance,
  getTokenAccounts,
  getNFTAccounts,
  getMintInfo,
  getLargestTokenHolders,
} from './drivers'

// Token operations
export {
  createToken,
  createSimpleToken,
  mintTokens,
  mintTokensToMany,
  transferTokens,
  transferTokensToMany,
  transfer,
  burnTokens,
  burnAll,
  burn,
  setMintAuthority,
  revokeMintAuthority,
  setFreezeAuthority,
  revokeFreezeAuthority,
  freezeAccount,
  thawAccount,
  getOrCreateAssociatedTokenAccount,
  createTokenAccount,
  closeTokenAccount,
  getTokenAccountInfo,
  createTokenMetadata,
  updateTokenMetadata,
  getTokenMetadata,
  getTokenInfo,
  getTokenSupply,
  getTokenHolders,
  getTokenHistory,
  getLargestAccounts,
} from './token'

// NFT operations
export {
  createNFT,
  createCollection,
  mintNFT,
  mintNFTToCollection,
  transferNFT,
  transferNFTs,
  transferNFTFrom,
  burnNFT,
  burnNFTFull,
  burnNFTs,
  // Metadata
  updateNFTMetadata,
  getNFTMetadata,
  fetchOffChainMetadata,
  getFullNFTData,
  verifyCreator,
  unverifyCreator,
  setAndVerifyCollection,
  // Queries
  getNFTsByOwner,
  getNFTsByCollection,
  getNFTsByCreator,
  getCollectionInfo,
  isInCollection,
  getNFTHolder,
  getNFTHistory,
  // Candy Machine
  createCandyMachine,
  addConfigLines,
  mintFromCandyMachine,
  // Compressed NFTs
  createMerkleTree,
  getMerkleTreeInfo,
  getTreeCapacity,
  mintCompressedNFT,
  mintCompressedNFTBatch,
  transferCompressedNFT,
  getAssetProof,
  getAsset,
  burnCompressedNFT,
  // Editions
  createMasterEdition,
  printEdition,
  getEditionInfo,
  getEditionsByMaster,
} from './nft'

// Storage adapters
export {
  getStorageAdapter,
  clearStorageAdapters,
  createStorageDriver,
  uploadWithFallback,
  createArweaveAdapter,
  createIPFSAdapter,
  createShadowDriveAdapter,
  createLocalAdapter,
  ArweaveStorageAdapter,
  IPFSStorageAdapter,
  ShadowDriveStorageAdapter,
} from './storage'

// Programs (namespace exports to avoid conflicts)
export * as programs from './programs'

// Security
export * as security from './security'

// Staking
export * as staking from './staking'

// Batch operations
export * as batch from './batch'

// Multi-sig
export * as multisig from './multisig'

// Governance
export * as governance from './governance'

// DeFi integrations
export * as defi from './defi'

// Marketplace integrations
export * as marketplace from './marketplace'

// Indexer / DAS API
export * as indexer from './indexer'

// Wallet adapters
export * as wallets from './wallets'

// Analytics
export * as analytics from './analytics'

// Fluent API
export * as fluent from './fluent'
export { TokenBuilder, tokens } from './fluent/token-builder'
export { NFTBuilder, nfts, CandyMachineBuilder, candyMachine } from './fluent/nft-builder'

// Simple NFT Standard
export * as simpleNFT from './simple-nft'

// Programmable NFTs
export * as pnft from './pnft'

// Events & Webhooks
export * as events from './events'

// Treasury
export * as treasury from './treasury'

// Voting Mechanisms
export * as voting from './voting'

// Internationalization
export * as i18n from './i18n'

// Debugging Tools
export * as debug from './debug'

// Automation & Scheduling
export * as automation from './automation'

// MPL Core NFT Standard
export * as core from './core'

// Transaction Utilities (Priority Fees)
export * as transaction from './transaction'

// Fanout Wallets
export * as fanout from './fanout'

// Link-Based Distribution
export * as distribution from './distribution'

// Compressed Tokens
export * as compressedToken from './compressed-token'

// Token Vesting
export * as vesting from './vesting'

// Solana Actions / Blinks
export * as actions from './actions'

// Legacy Migration & Compatibility
export * as legacy from './legacy'
export * as compat from './compat'
