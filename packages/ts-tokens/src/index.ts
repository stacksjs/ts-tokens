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
} from './token'

// NFT operations
export {
  createNFT,
  createCollection,
  mintNFT,
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
  createArweaveAdapter,
  createIPFSAdapter,
  createShadowDriveAdapter,
  createLocalAdapter,
  ArweaveStorageAdapter,
  IPFSStorageAdapter,
  ShadowDriveStorageAdapter,
} from './storage'
