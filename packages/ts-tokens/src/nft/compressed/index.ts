/**
 * Compressed NFT Operations
 *
 * Create and manage compressed NFTs (cNFTs) using Merkle trees.
 */

export * from './mint'
export {
  mintCompressedNFT,
  mintCompressedNFTBatch,
} from './mint'
export type {
  CompressedNFTMetadata,
  CompressedNFTResult,
  MintCompressedNFTOptions,
} from './mint'

export * from './transfer'

export {
  burnCompressedNFT,
  getAsset,
  getAssetProof,
  transferCompressedNFT,
} from './transfer'

export type {
  AssetProof,
  TransferCompressedNFTOptions,
} from './transfer'

export * from './tree'

// Re-export main functions
export {
  calculateTreeCapacity,
  calculateTreeSpace,
  createMerkleTree,
  getMerkleTreeInfo,
  getTreeCapacity,
  TREE_CONFIGS,
} from './tree'

// Re-export types
export type {
  MerkleTreeConfig,
  MerkleTreeResult,
} from './tree'
