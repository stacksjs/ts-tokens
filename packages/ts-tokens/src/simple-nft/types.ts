/**
 * Simple NFT Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Simple NFT data structure
 * Combines mint, metadata, and edition in one account
 */
export interface SimpleNFT {
  mint: PublicKey
  owner: PublicKey
  name: string
  symbol: string
  uri: string
  royalty: number // Percentage (5 = 5%)
  creators: SimpleCreator[]
  collection?: PublicKey
  collectionVerified: boolean
  isMutable: boolean
  primarySaleHappened: boolean
  editionInfo?: EditionInfo
}

/**
 * Simple creator
 */
export interface SimpleCreator {
  address: PublicKey
  share: number // Percentage (100 total)
  verified: boolean
}

/**
 * Edition info
 */
export interface EditionInfo {
  isMaster: boolean
  maxSupply?: number
  currentSupply: number
  editionNumber?: number
  parent?: PublicKey
}

/**
 * Simple collection
 */
export interface SimpleCollection {
  mint: PublicKey
  authority: PublicKey
  name: string
  symbol: string
  uri: string
  royalty: number
  size: number
  verified: boolean
}

/**
 * Create NFT options
 */
export interface CreateSimpleNFTOptions {
  name: string
  symbol?: string
  description?: string
  image: string | Buffer
  attributes?: Array<{ trait: string; value: string | number }>
  royalty?: number
  creators?: Array<{ address: PublicKey; share: number }>
  collection?: PublicKey
  isMutable?: boolean
  maxEditions?: number
}

/**
 * Create collection options
 */
export interface CreateSimpleCollectionOptions {
  name: string
  symbol?: string
  description?: string
  image: string | Buffer
  royalty?: number
  size?: number
}

/**
 * Metadata input - flexible input format
 */
export type MetadataInput =
  | string // URI
  | { uri: string } // Object with URI
  | SimpleMetadataObject // Full metadata object
  | { file: string } // Local file path

/**
 * Simple metadata object
 */
export interface SimpleMetadataObject {
  name: string
  symbol?: string
  description?: string
  image: string
  animation_url?: string
  external_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  properties?: {
    files?: Array<{
      uri: string
      type: string
    }>
    category?: string
  }
}

/**
 * NFT state
 */
export type NFTState = 'unlocked' | 'listed' | 'staked' | 'frozen'

/**
 * Transfer result
 */
export interface TransferResult {
  signature: string
  from: PublicKey
  to: PublicKey
  mint: PublicKey
}

/**
 * Burn result
 */
export interface BurnResult {
  signature: string
  mint: PublicKey
  owner: PublicKey
}

/**
 * Update simple NFT options
 */
export interface UpdateSimpleNFTOptions {
  name?: string
  symbol?: string
  uri?: string
  royalty?: number
  creators?: Array<{ address: PublicKey; share: number }>
  isMutable?: boolean
}

/**
 * Batch create options
 */
export interface BatchCreateOptions {
  items: CreateSimpleNFTOptions[]
  onProgress?: (completed: number, total: number) => void
}

/**
 * Batch transfer options
 */
export interface BatchTransferOptions {
  mints: string[]
  to: string
  onProgress?: (completed: number, total: number) => void
}

/**
 * Simple NFT result (from creation)
 */
export interface SimpleNFTResult {
  mint: string
  metadata: string
  masterEdition: string
  signature: string
  uri: string
}

/**
 * Simple collection result (from creation)
 */
export interface SimpleCollectionResult extends SimpleNFTResult {}

/**
 * Freeze/thaw result
 */
export interface FreezeResult {
  signature: string
  mint: string
  account: string
}

/**
 * Delegation result
 */
export interface DelegateResult {
  signature: string
  mint: string
  delegate: string
}

/**
 * Edition result
 */
export interface EditionResult {
  mint: string
  metadata: string
  edition: string
  editionNumber: number
  signature: string
}

/**
 * Master edition result
 */
export interface MasterEditionResult {
  signature: string
  mint: string
  masterEdition: string
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  successful: T[]
  failed: Array<{ index: number; error: string }>
  total: number
}
