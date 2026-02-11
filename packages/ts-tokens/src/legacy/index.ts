/**
 * Legacy Migration & Compatibility Module
 *
 * Unified facade over existing NFT/token infrastructure for legacy
 * collection management, discovery, import/export, and batch operations.
 */

// Collection discovery & import
export {
  importCollection,
  discoverCollectionByCreator,
  discoverCollectionByAuthority,
  discoverCollectionByCandyMachine,
  detectCollectionVersion,
} from './collection'

// Metadata read/write
export {
  getCollectionMetadata,
  updateCollectionMetadata,
  updateCollectionUri,
  updateCollectionRoyalty,
  getNFTsInCollection,
  getLegacyNFTMetadata,
  updateLegacyNFTMetadata,
  updateNFTUri,
  batchUpdateNFTMetadata,
} from './metadata'

// Authority & creator management
export {
  getCollectionAuthorities,
  transferUpdateAuthority,
  transferNFTUpdateAuthority,
  batchTransferUpdateAuthority,
  setCollectionAuthority,
  revokeCollectionAuthority,
  verifyCreator,
  unverifyCreator,
  batchVerifyCreator,
  updateCreators,
} from './authority'

// Collection verification
export {
  verifyNFTInCollection,
  unverifyNFTFromCollection,
  batchVerifyCollection,
  setAndVerifyCollection,
  migrateToSizedCollection,
} from './verification'

// Royalty management
export {
  getRoyaltyInfo,
  updateRoyalty,
  updateCreators as updateRoyaltyCreators,
} from './royalty'

// Edition management
export {
  getLegacyEditionInfo,
  printLegacyEdition,
  getEditionsByMaster,
  updateMasterEditionMaxSupply,
} from './editions'

// Burn & close
export {
  burnNFT,
  burnEdition,
  batchBurnNFTs,
  closeEmptyAccounts,
} from './burn'

// Freeze/thaw
export {
  freezeNFT,
  thawNFT,
  batchFreezeNFTs,
  batchThawNFTs,
} from './freeze'

// Delegation
export {
  delegateNFT,
  revokeDelegate,
  getDelegateInfo,
} from './delegation'

// Analytics
export {
  getCollectionStats,
  getHolderSnapshot,
  getCollectionHistory,
  exportCollectionData,
} from './analytics'

// Candy Machine
export {
  getCandyMachineInfo,
  updateCandyMachine,
  withdrawCandyMachineFunds,
  closeCandyMachine,
} from './candy-machine'

// Import/Export
export {
  importCollectionFromOnChain,
  importFromSugarConfig,
  validateSugarConfig,
} from './import'

export {
  exportToJSON,
  exportToCSV,
  exportHoldersToCSV,
  exportToMetaplexFormat,
} from './export'

// Batch executor
export { executeBatch } from './batch'
