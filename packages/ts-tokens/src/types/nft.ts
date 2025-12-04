/**
 * NFT Types
 *
 * Type definitions for NFT and collection operations.
 */

import type { TransactionOptions } from './transaction'
import type { Creator, OnChainMetadata, OffChainMetadata, MasterEditionInfo, TokenStandard } from './metadata'

/**
 * Collection creation options
 */
export interface CreateCollectionOptions {
  /**
   * Collection name
   */
  name: string

  /**
   * Collection symbol
   */
  symbol: string

  /**
   * Metadata URI (JSON file URL)
   */
  uri: string

  /**
   * Royalty in basis points (e.g., 500 = 5%)
   * @default 0
   */
  sellerFeeBasisPoints?: number

  /**
   * Creator array with shares
   */
  creators?: Creator[]

  /**
   * Whether metadata can be updated
   * @default true
   */
  isMutable?: boolean

  /**
   * Collection size (for sized collections)
   */
  size?: number

  /**
   * Update authority
   * @default Current wallet
   */
  updateAuthority?: string

  /**
   * Transaction options
   */
  options?: TransactionOptions
}

/**
 * NFT minting options
 */
export interface MintNFTOptions {
  /**
   * NFT name
   */
  name: string

  /**
   * NFT symbol
   */
  symbol: string

  /**
   * Metadata URI (JSON file URL)
   */
  uri: string

  /**
   * Royalty in basis points (e.g., 500 = 5%)
   * @default 0
   */
  sellerFeeBasisPoints?: number

  /**
   * Creator array with shares
   */
  creators?: Creator[]

  /**
   * Collection address to add NFT to
   */
  collection?: string

  /**
   * Whether to verify collection (requires collection authority)
   * @default true if collection is provided
   */
  verifyCollection?: boolean

  /**
   * Whether metadata can be updated
   * @default true
   */
  isMutable?: boolean

  /**
   * Max supply for editions (0 = 1/1, null = unlimited)
   * @default 0
   */
  maxSupply?: number | null

  /**
   * Recipient address
   * @default Current wallet
   */
  recipient?: string

  /**
   * Token standard
   * @default 'NonFungible'
   */
  tokenStandard?: TokenStandard

  /**
   * Rule set for programmable NFTs
   */
  ruleSet?: string

  /**
   * Transaction options
   */
  options?: TransactionOptions
}

/**
 * NFT information
 */
export interface NFTInfo {
  /**
   * NFT mint address
   */
  mint: string

  /**
   * Current owner
   */
  owner: string

  /**
   * On-chain metadata
   */
  metadata: OnChainMetadata

  /**
   * Off-chain metadata (fetched from URI)
   */
  offChainMetadata?: OffChainMetadata

  /**
   * Master edition info (if applicable)
   */
  masterEdition?: MasterEditionInfo

  /**
   * Edition number (if this is a print)
   */
  edition?: number

  /**
   * Whether NFT is frozen
   */
  isFrozen: boolean

  /**
   * Delegate (if any)
   */
  delegate?: string

  /**
   * Token standard
   */
  tokenStandard: TokenStandard

  /**
   * Whether this is a compressed NFT
   */
  isCompressed: boolean

  /**
   * Compression info (for cNFTs)
   */
  compression?: {
    leafId: number
    treeAddress: string
    proof: string[]
    dataHash: string
    creatorHash: string
  }
}

/**
 * Collection information
 */
export interface CollectionInfo {
  /**
   * Collection mint address
   */
  mint: string

  /**
   * On-chain metadata
   */
  metadata: OnChainMetadata

  /**
   * Off-chain metadata
   */
  offChainMetadata?: OffChainMetadata

  /**
   * Master edition info
   */
  masterEdition: MasterEditionInfo

  /**
   * Collection size (if sized)
   */
  size?: number

  /**
   * Number of verified items
   */
  verifiedItems?: number

  /**
   * Update authority
   */
  updateAuthority: string

  /**
   * Whether collection is mutable
   */
  isMutable: boolean
}

/**
 * Candy Machine configuration
 */
export interface CandyMachineConfig {
  /**
   * Total items available
   */
  itemsAvailable: number

  /**
   * Royalty in basis points
   */
  sellerFeeBasisPoints: number

  /**
   * Collection symbol
   */
  symbol: string

  /**
   * Max editions per NFT (0 = unique)
   */
  maxEditionSupply: number

  /**
   * Whether metadata is mutable
   */
  isMutable: boolean

  /**
   * Creators array
   */
  creators: Creator[]

  /**
   * Collection NFT address
   */
  collection: string

  /**
   * Config line settings
   */
  configLineSettings?: {
    prefixName: string
    nameLength: number
    prefixUri: string
    uriLength: number
    isSequential: boolean
  }

  /**
   * Hidden settings (for reveals)
   */
  hiddenSettings?: {
    name: string
    uri: string
    hash: string
  }
}

/**
 * Candy Machine guard types
 */
export type CandyGuardType =
  | 'solPayment'
  | 'tokenPayment'
  | 'nftPayment'
  | 'startDate'
  | 'endDate'
  | 'mintLimit'
  | 'allowList'
  | 'nftGate'
  | 'tokenGate'
  | 'redeemedAmount'
  | 'addressGate'
  | 'freezeSolPayment'
  | 'freezeTokenPayment'
  | 'programGate'
  | 'allocation'
  | 'token2022Payment'
  | 'botTax'
  | 'gatekeeper'

/**
 * Candy Machine guard configuration
 */
export interface CandyGuard {
  /**
   * Guard type
   */
  type: CandyGuardType

  /**
   * Guard-specific settings
   */
  settings: Record<string, unknown>
}

/**
 * Candy Machine information
 */
export interface CandyMachineInfo {
  /**
   * Candy Machine address
   */
  address: string

  /**
   * Authority
   */
  authority: string

  /**
   * Mint authority
   */
  mintAuthority: string

  /**
   * Collection mint
   */
  collectionMint: string

  /**
   * Items available
   */
  itemsAvailable: number

  /**
   * Items redeemed
   */
  itemsRedeemed: number

  /**
   * Items remaining
   */
  itemsRemaining: number

  /**
   * Configuration
   */
  config: CandyMachineConfig

  /**
   * Guards (if using Candy Guard)
   */
  guards?: CandyGuard[]

  /**
   * Candy Guard address
   */
  candyGuard?: string

  /**
   * Version
   */
  version: 'v1' | 'v2' | 'v3'
}

/**
 * Compressed NFT tree configuration
 */
export interface MerkleTreeConfig {
  /**
   * Maximum depth (determines capacity: 2^depth)
   */
  maxDepth: number

  /**
   * Maximum buffer size (concurrent updates)
   */
  maxBufferSize: number

  /**
   * Canopy depth (proof caching)
   */
  canopyDepth?: number

  /**
   * Public (anyone can append)
   * @default false
   */
  public?: boolean
}

/**
 * Merkle tree information
 */
export interface MerkleTreeInfo {
  /**
   * Tree address
   */
  address: string

  /**
   * Authority
   */
  authority: string

  /**
   * Tree creator
   */
  treeCreator: string

  /**
   * Maximum depth
   */
  maxDepth: number

  /**
   * Maximum buffer size
   */
  maxBufferSize: number

  /**
   * Canopy depth
   */
  canopyDepth: number

  /**
   * Current sequence number
   */
  sequenceNumber: number

  /**
   * Active index
   */
  activeIndex: number

  /**
   * Buffer size
   */
  bufferSize: number

  /**
   * Total capacity
   */
  capacity: number

  /**
   * Remaining capacity
   */
  remaining: number
}

/**
 * Edition print options
 */
export interface PrintEditionOptions {
  /**
   * Master edition mint address
   */
  masterMint: string

  /**
   * Recipient address
   * @default Current wallet
   */
  recipient?: string

  /**
   * Specific edition number (optional)
   */
  editionNumber?: number

  /**
   * Transaction options
   */
  options?: TransactionOptions
}

/**
 * NFT update options
 */
export interface UpdateNFTOptions {
  /**
   * NFT mint address
   */
  mint: string

  /**
   * New name
   */
  name?: string

  /**
   * New symbol
   */
  symbol?: string

  /**
   * New URI
   */
  uri?: string

  /**
   * New royalty in basis points
   */
  sellerFeeBasisPoints?: number

  /**
   * New creators
   */
  creators?: Creator[]

  /**
   * New primary sale happened flag
   */
  primarySaleHappened?: boolean

  /**
   * New mutable flag
   */
  isMutable?: boolean

  /**
   * Transaction options
   */
  options?: TransactionOptions
}
