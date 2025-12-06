/**
 * ts-tokens
 *
 * A TypeScript library for managing fungible and non-fungible tokens on Solana.
 * Zero external dependencies beyond official Solana packages.
 *
 * @packageDocumentation
 */

// Analytics
export * as analytics from './analytics'

// Batch operations
export * as batch from './batch'

// Configuration (some functions may shadow type exports)
export {
  config,
  defaults,
  getConfig,
  getCurrentConfig,
  mergeConfig,
  resetConfig,
  setConfig,
} from './config'

// Debugging Tools
export * as debug from './debug'

// DeFi integrations
export * as defi from './defi'

// Drivers (export specific items to avoid conflicts)
export {
  buildTransaction,
  createDriverRegistry,
  createSolanaConnection,
  createWallet,
  driverRegistry,
  estimatePriorityFee,
  generateKeypair,
  // Account utilities
  getAccountInfo,
  getBalance,
  getDriver,
  getLargestTokenHolders,
  getMintInfo,
  getMultipleAccounts,
  getNFTAccounts,
  getTokenAccounts,
  getTokenBalance,
  hasDriver,
  listDrivers,
  loadWallet,
  registerDriver,
  sendAndConfirmTransaction,
  simulateTransaction,
  // Solana driver exports
  SolanaConnection,
} from './drivers'

// Events & Webhooks
export * as events from './events'

// Fluent API
export * as fluent from './fluent'

export { candyMachine, CandyMachineBuilder, NFTBuilder, nfts } from './fluent/nft-builder'

export { TokenBuilder, tokens } from './fluent/token-builder'

// Governance
export * as governance from './governance'

// Internationalization
export * as i18n from './i18n'

// Indexer / DAS API
export * as indexer from './indexer'

// Marketplace integrations
export * as marketplace from './marketplace'

// Multi-sig
export * as multisig from './multisig'

// NFT operations
export {
  addConfigLines,
  burnCompressedNFT,
  burnNFT,
  burnNFTFull,
  burnNFTs,
  // Candy Machine
  createCandyMachine,
  createCollection,
  // Editions
  createMasterEdition,
  // Compressed NFTs
  createMerkleTree,
  createNFT,
  fetchOffChainMetadata,
  getAsset,
  getAssetProof,
  getCollectionInfo,
  getEditionInfo,
  getEditionsByMaster,
  getFullNFTData,
  getMerkleTreeInfo,
  getNFTHistory,
  getNFTHolder,
  getNFTMetadata,
  getNFTsByCollection,
  getNFTsByCreator,
  // Queries
  getNFTsByOwner,
  getTreeCapacity,
  isInCollection,
  mintCompressedNFT,
  mintCompressedNFTBatch,
  mintFromCandyMachine,
  mintNFT,
  printEdition,
  setAndVerifyCollection,
  transferCompressedNFT,
  transferNFT,
  transferNFTFrom,
  transferNFTs,
  unverifyCreator,
  // Metadata
  updateNFTMetadata,
  verifyCreator,
} from './nft'

// Programmable NFTs
export * as pnft from './pnft'

// Programs (namespace exports to avoid conflicts)
export * as programs from './programs'

// Security
export * as security from './security'
// Simple NFT Standard
export * as simpleNFT from './simple-nft'
// Staking
export * as staking from './staking'

// Storage adapters
export {
  ArweaveStorageAdapter,
  clearStorageAdapters,
  createArweaveAdapter,
  createIPFSAdapter,
  createLocalAdapter,
  createShadowDriveAdapter,
  getStorageAdapter,
  IPFSStorageAdapter,
  ShadowDriveStorageAdapter,
} from './storage'

// Token operations
export {
  burn,
  burnAll,
  burnTokens,
  closeTokenAccount,
  createSimpleToken,
  createToken,
  createTokenAccount,
  freezeAccount,
  getOrCreateAssociatedTokenAccount,
  getTokenAccountInfo,
  mintTokens,
  mintTokensToMany,
  revokeFreezeAuthority,
  revokeMintAuthority,
  setFreezeAuthority,
  setMintAuthority,
  thawAccount,
  transfer,
  transferTokens,
  transferTokensToMany,
} from './token'

// Treasury
export * as treasury from './treasury'

// Types (export first to avoid conflicts)
export * from './types'

// Utilities
export * from './utils'

// Voting Mechanisms
export * as voting from './voting'

// Wallet adapters
export * as wallets from './wallets'
