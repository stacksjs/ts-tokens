/**
 * Legacy Module Types
 *
 * Type definitions for legacy NFT migration and compatibility tools.
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Collection version detected from on-chain data
 */
export enum CollectionVersion {
  /** Original Metaplex collection (no collectionDetails) */
  Legacy = 'legacy',
  /** Sized collection with collectionDetails.size */
  Sized = 'sized',
  /** Programmable NFT collection */
  ProgrammableNFT = 'pnft',
  /** MPL Core collection */
  Core = 'core',
}

/**
 * Candy Machine version
 */
export enum CandyMachineVersion {
  V1 = 'v1',
  V2 = 'v2',
  V3 = 'v3',
}

/**
 * Imported collection info
 */
export interface LegacyCollectionInfo {
  /** Collection mint address */
  mint: string
  /** Collection name */
  name: string
  /** Collection symbol */
  symbol: string
  /** Metadata URI */
  uri: string
  /** Detected collection version */
  version: CollectionVersion
  /** Update authority address */
  updateAuthority: string
  /** Seller fee basis points */
  sellerFeeBasisPoints: number
  /** Whether metadata is mutable */
  isMutable: boolean
  /** Collection size (if sized collection) */
  size?: number
  /** Creators list */
  creators: Array<{ address: string; verified: boolean; share: number }>
  /** Off-chain metadata (if fetched) */
  offChainMetadata?: Record<string, unknown> | null
  /** Token standard */
  tokenStandard?: number | null
}

/**
 * Options for fetching NFTs
 */
export interface GetNFTsOptions {
  /** Page number for pagination */
  page?: number
  /** Items per page */
  limit?: number
  /** Sort configuration */
  sortBy?: { sortBy: 'created' | 'updated'; sortDirection: 'asc' | 'desc' }
  /** Use DAS API if available */
  useDAS?: boolean
}

/**
 * Paginated NFT result
 */
export interface PaginatedNFTs {
  /** NFT items */
  items: LegacyNFTItem[]
  /** Total items available */
  total: number
  /** Current page */
  page: number
  /** Items per page */
  limit: number
}

/**
 * Individual NFT item in a collection
 */
export interface LegacyNFTItem {
  /** Mint address */
  mint: string
  /** NFT name */
  name: string
  /** NFT symbol */
  symbol: string
  /** Metadata URI */
  uri: string
  /** Owner address */
  owner?: string
  /** Whether it's compressed */
  compressed?: boolean
  /** Collection address */
  collection?: string
  /** Whether collection membership is verified */
  collectionVerified?: boolean
}

/**
 * Collection authorities info
 */
export interface CollectionAuthorities {
  /** Update authority address */
  updateAuthority: string
  /** Delegated collection authorities */
  delegatedAuthorities: string[]
}

/**
 * Royalty information
 */
export interface RoyaltyInfo {
  /** Seller fee basis points (0-10000) */
  basisPoints: number
  /** Percentage representation */
  percentage: number
  /** Creators with shares */
  creators: Array<{
    address: string
    verified: boolean
    share: number
  }>
  /** Whether primary sale has happened */
  primarySaleHappened: boolean
}

/**
 * Master edition info
 */
export interface LegacyMasterEditionInfo {
  /** Mint address */
  mint: string
  /** Edition type */
  type: 'master'
  /** Current supply of prints */
  supply: number
  /** Maximum supply (null = unlimited) */
  maxSupply: number | null
}

/**
 * Print edition info
 */
export interface LegacyEditionInfo {
  /** Mint address */
  mint: string
  /** Edition type */
  type: 'print'
  /** Parent master edition mint */
  parent: string
  /** Edition number */
  edition: number
}

/**
 * Collection statistics
 */
export interface CollectionStats {
  /** Total NFTs in collection */
  totalItems: number
  /** Number of unique holders */
  uniqueHolders: number
  /** Number of listed items */
  listedItems: number
  /** Floor price in SOL (if available) */
  floorPrice?: number
}

/**
 * Holder entry for snapshots
 */
export interface HolderEntry {
  /** Wallet address */
  owner: string
  /** Mints held */
  mints: string[]
  /** Number of NFTs held */
  count: number
}

/**
 * Delegate information
 */
export interface DelegateInfo {
  /** Token account address */
  tokenAccount: string
  /** Mint address */
  mint: string
  /** Owner address */
  owner: string
  /** Delegate address (null if no delegate) */
  delegate: string | null
  /** Delegated amount */
  delegatedAmount: bigint
  /** Whether account is frozen */
  isFrozen: boolean
}

/**
 * Legacy candy machine info
 */
export interface LegacyCandyMachineInfo {
  /** Candy machine address */
  address: string
  /** Detected version */
  version: CandyMachineVersion
  /** Authority address */
  authority: string
  /** Collection mint address */
  collectionMint: string
  /** Total items available */
  itemsAvailable: number
  /** Items already minted */
  itemsRedeemed: number
  /** Symbol */
  symbol: string
  /** Seller fee basis points */
  sellerFeeBasisPoints: number
  /** Whether metadata is mutable */
  isMutable: boolean
  /** Creators */
  creators: Array<{ address: string; verified: boolean; share: number }>
  /** Config line settings */
  configLineSettings?: {
    prefixName: string
    nameLength: number
    prefixUri: string
    uriLength: number
    isSequential: boolean
  } | null
  /** Hidden settings */
  hiddenSettings?: {
    name: string
    uri: string
    hash: string
  } | null
}

/**
 * Export format options
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  Metaplex = 'metaplex',
}

/**
 * Progress callback for batch operations
 */
export type ProgressCallback = (
  completed: number,
  total: number,
  currentItem?: string
) => void

/**
 * Sugar config format (Metaplex Sugar CLI)
 */
export interface SugarConfig {
  price: number
  number: number
  symbol: string
  sellerFeeBasisPoints: number
  solTreasuryAccount: string
  goLiveDate: string
  noRetainAuthority: boolean
  noMutable: boolean
  creators: Array<{
    address: string
    share: number
  }>
  uploadMethod?: string
  awsS3Bucket?: string
  nftStorageAuthToken?: string
  /** Collection mint (if set) */
  collection?: string
}

/**
 * Batch operation result
 */
export interface BatchResult<T = string> {
  /** Successfully processed items */
  successful: T[]
  /** Failed items with errors */
  failed: Array<{ item: string; error: string }>
  /** Total items processed */
  total: number
}

/**
 * Import result
 */
export interface ImportResult {
  /** Collection info */
  collection: LegacyCollectionInfo
  /** Number of NFTs found */
  nftCount: number
  /** Sample NFTs (first few) */
  sampleNFTs: LegacyNFTItem[]
}

/**
 * Metaplex SDK compatible types for the shim layer
 */
export interface MetaplexNft {
  address: string
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints: number
  creators: Array<{ address: string; verified: boolean; share: number }>
  primarySaleHappened: boolean
  isMutable: boolean
  updateAuthorityAddress: string
  collection?: { address: string; verified: boolean } | null
  json?: Record<string, unknown> | null
}

/**
 * Collection history entry
 */
export interface CollectionHistoryEntry {
  /** Transaction signature */
  signature: string
  /** Slot number */
  slot: number
  /** Block time (unix timestamp) */
  blockTime: number | null
  /** Transaction type */
  type: string
}
