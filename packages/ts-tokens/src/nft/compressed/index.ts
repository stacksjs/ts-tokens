/**
 * Compressed NFT Operations
 *
 * Create and manage compressed NFTs (cNFTs) using Merkle trees.
 */

export * from './tree'
export * from './mint'
export * from './transfer'

// Re-export main functions
export {
  createMerkleTree,
  getMerkleTreeInfo,
  getTreeCapacity,
  calculateTreeCapacity,
  calculateTreeSpace,
  TREE_CONFIGS,
} from './tree'

export {
  mintCompressedNFT,
  mintCompressedNFTBatch,
} from './mint'

export {
  transferCompressedNFT,
  getAssetProof,
  getAsset,
  burnCompressedNFT,
} from './transfer'

// Re-export types
export type {
  MerkleTreeConfig,
  MerkleTreeResult,
} from './tree'

export type {
  CompressedNFTMetadata,
  MintCompressedNFTOptions,
  CompressedNFTResult,
} from './mint'

export type {
  AssetProof,
  TransferCompressedNFTOptions,
} from './transfer'
