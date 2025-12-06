/**
 * Storage Types
 *
 * Type definitions for storage providers (Arweave, IPFS, Shadow Drive, etc.)
 */

/**
 * Storage provider types
 */
export type StorageProviderType = 'arweave' | 'ipfs' | 'shadow-drive' | 'local'

/**
 * Upload result
 */
export interface UploadResult {
  /**
   * Content identifier (transaction ID, CID, etc.)
   */
  id: string

  /**
   * Public URL to access the content
   */
  url: string

  /**
   * Storage provider used
   */
  provider: StorageProviderType

  /**
   * Content size in bytes
   */
  size: number

  /**
   * Content type (MIME type)
   */
  contentType: string

  /**
   * Upload cost (in native token units)
   */
  cost?: bigint

  /**
   * Transaction signature (if applicable)
   */
  signature?: string
}

/**
 * Upload options
 */
export interface UploadOptions {
  /**
   * Content type (MIME type)
   * @default Auto-detected
   */
  contentType?: string

  /**
   * Custom tags (for Arweave)
   */
  tags?: Array<{ name: string, value: string }>

  /**
   * Pin content (for IPFS)
   * @default true
   */
  pin?: boolean

  /**
   * Wrap in directory (for IPFS)
   * @default false
   */
  wrapWithDirectory?: boolean

  /**
   * Progress callback
   */
  onProgress?: (progress: UploadProgress) => void
}

/**
 * Upload progress
 */
export interface UploadProgress {
  /**
   * Bytes uploaded
   */
  loaded: number

  /**
   * Total bytes
   */
  total: number

  /**
   * Progress percentage (0-100)
   */
  percentage: number
}

/**
 * Batch upload result
 */
export interface BatchUploadResult {
  /**
   * Individual upload results
   */
  results: UploadResult[]

  /**
   * Manifest URL (if created)
   */
  manifestUrl?: string

  /**
   * Total cost
   */
  totalCost?: bigint

  /**
   * Failed uploads
   */
  failed: Array<{
    file: string
    error: string
  }>
}

/**
 * Storage adapter interface
 *
 * All storage providers must implement this interface.
 */
export interface StorageAdapter {
  /**
   * Provider name
   */
  readonly name: StorageProviderType

  /**
   * Upload a file
   */
  upload: (data: Uint8Array | string, options?: UploadOptions) => Promise<UploadResult>

  /**
   * Upload a file from path
   */
  uploadFile: (path: string, options?: UploadOptions) => Promise<UploadResult>

  /**
   * Upload multiple files
   */
  uploadBatch: (files: Array<{ path: string, name?: string }>, options?: UploadOptions) => Promise<BatchUploadResult>

  /**
   * Upload JSON data
   */
  uploadJson: (data: Record<string, unknown>, options?: UploadOptions) => Promise<UploadResult>

  /**
   * Download content
   */
  download: (id: string) => Promise<Uint8Array>

  /**
   * Get public URL for content
   */
  getUrl: (id: string) => string

  /**
   * Check if content exists
   */
  exists: (id: string) => Promise<boolean>

  /**
   * Get upload cost estimate
   */
  estimateCost: (size: number) => Promise<bigint>

  /**
   * Get current balance (for paid storage)
   */
  getBalance?: () => Promise<bigint>

  /**
   * Fund storage account
   */
  fund?: (amount: bigint) => Promise<string>
}

/**
 * Arweave-specific configuration
 */
export interface ArweaveConfig {
  /**
   * Gateway URL
   * @default 'https://arweave.net'
   */
  gateway: string

  /**
   * Use Irys/Bundlr for uploads
   * @default false
   */
  useBundlr: boolean

  /**
   * Bundlr node URL
   * @default 'https://node1.irys.xyz'
   */
  bundlrNode?: string

  /**
   * Wallet for signing (JWK or path)
   */
  wallet?: unknown

  /**
   * Timeout in milliseconds
   * @default 30000
   */
  timeout: number
}

/**
 * IPFS-specific configuration
 */
export interface IPFSConfig {
  /**
   * IPFS API endpoint
   * @default 'http://localhost:5001'
   */
  apiEndpoint: string

  /**
   * Gateway URL for public access
   * @default 'https://ipfs.io'
   */
  gateway: string

  /**
   * Pinning service (pinata, nft.storage, web3.storage, infura)
   */
  pinningService?: 'pinata' | 'nft.storage' | 'web3.storage' | 'infura'

  /**
   * Pinning service API key
   */
  pinningApiKey?: string

  /**
   * Pinning service secret (if required)
   */
  pinningSecret?: string

  /**
   * Timeout in milliseconds
   * @default 30000
   */
  timeout: number
}

/**
 * Shadow Drive-specific configuration
 */
export interface ShadowDriveConfig {
  /**
   * Storage account public key
   */
  storageAccount: string

  /**
   * RPC endpoint
   */
  rpcEndpoint: string

  /**
   * Wallet for signing
   */
  wallet?: unknown
}

/**
 * Local storage configuration (for development)
 */
export interface LocalStorageConfig {
  /**
   * Base directory for file storage
   * @default './storage'
   */
  baseDir: string

  /**
   * Base URL for serving files
   * @default 'http://localhost:3000/storage'
   */
  baseUrl: string
}

/**
 * Storage account information (for Shadow Drive)
 */
export interface StorageAccountInfo {
  /**
   * Account address
   */
  address: string

  /**
   * Owner
   */
  owner: string

  /**
   * Total storage in bytes
   */
  totalStorage: number

  /**
   * Used storage in bytes
   */
  usedStorage: number

  /**
   * Available storage in bytes
   */
  availableStorage: number

  /**
   * Whether account is immutable
   */
  immutable: boolean

  /**
   * Creation timestamp
   */
  createdAt: number

  /**
   * Files in account
   */
  files: StorageFile[]
}

/**
 * Storage file information
 */
export interface StorageFile {
  /**
   * File name
   */
  name: string

  /**
   * File size in bytes
   */
  size: number

  /**
   * Public URL
   */
  url: string

  /**
   * Content type
   */
  contentType: string

  /**
   * Upload timestamp
   */
  uploadedAt: number
}

/**
 * Metadata JSON structure for NFTs
 */
export interface NFTMetadataJson {
  /**
   * NFT name
   */
  name: string

  /**
   * NFT symbol
   */
  symbol: string

  /**
   * Description
   */
  description: string

  /**
   * Image URL
   */
  image: string

  /**
   * Animation URL (for video/audio)
   */
  animation_url?: string

  /**
   * External URL
   */
  external_url?: string

  /**
   * Attributes/traits
   */
  attributes?: Array<{
    trait_type: string
    value: string | number
    display_type?: string
  }>

  /**
   * Properties
   */
  properties?: {
    files?: Array<{
      uri: string
      type: string
    }>
    category?: string
    creators?: Array<{
      address: string
      share: number
    }>
  }

  /**
   * Seller fee basis points
   */
  seller_fee_basis_points?: number

  /**
   * Collection info
   */
  collection?: {
    name: string
    family?: string
  }
}
