/**
 * Configuration Types
 *
 * Defines all configuration options for ts-tokens.
 */

/**
 * Supported blockchain networks
 */
export type Chain = 'solana'

/**
 * Solana network environments
 */
export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'

/**
 * Solana transaction commitment levels
 */
export type Commitment = 'processed' | 'confirmed' | 'finalized'

/**
 * Supported storage providers for metadata and assets
 */
export type StorageProvider = 'arweave' | 'ipfs' | 'shadow-drive' | 'local'

/**
 * Wallet configuration options
 */
export interface WalletConfig {
  /**
   * Path to keypair file (JSON format)
   */
  keypairPath?: string

  /**
   * Environment variable name containing the keypair
   */
  keypairEnv?: string

  /**
   * Use browser wallet adapter (for web applications)
   */
  useAdapter?: boolean
}

/**
 * Transaction confirmation options
 */
export interface ConfirmOptions {
  /**
   * Skip preflight transaction checks
   * @default false
   */
  skipPreflight?: boolean

  /**
   * Commitment level for confirmation
   * @default 'confirmed'
   */
  commitment?: Commitment

  /**
   * Maximum number of retries
   * @default 3
   */
  maxRetries?: number

  /**
   * Preflight commitment level
   */
  preflightCommitment?: Commitment

  /**
   * Confirmation timeout in milliseconds
   * @default 30000
   */
  timeout?: number
}

/**
 * RPC endpoint configuration
 */
export interface RpcConfig {
  /**
   * Primary RPC endpoint URL
   */
  url: string

  /**
   * Fallback RPC endpoints (used if primary fails)
   */
  fallbacks?: string[]

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Maximum requests per second (rate limiting)
   * @default 10
   */
  rateLimit?: number
}

/**
 * Storage provider configuration
 */
export interface StorageConfig {
  /**
   * Default storage provider
   * @default 'arweave'
   */
  provider: StorageProvider

  /**
   * Arweave-specific configuration
   */
  arweave?: {
    /**
     * Gateway URL
     * @default 'https://arweave.net'
     */
    gateway?: string

    /**
     * Use Irys/Bundlr for uploads
     * @default false
     */
    useBundlr?: boolean
  }

  /**
   * IPFS-specific configuration
   */
  ipfs?: {
    /**
     * IPFS gateway URL
     * @default 'https://ipfs.io'
     */
    gateway?: string

    /**
     * Pinning service to use
     */
    pinningService?: 'pinata' | 'nft.storage' | 'web3.storage' | 'infura'

    /**
     * Pinning service API key
     */
    pinningApiKey?: string
  }

  /**
   * Shadow Drive-specific configuration
   */
  shadowDrive?: {
    /**
     * Storage account public key
     */
    storageAccount?: string
  }

  /**
   * Local storage configuration (for development)
   */
  local?: {
    /**
     * Base directory for local storage
     * @default './storage'
     */
    baseDir?: string

    /**
     * Base URL for serving local files
     * @default 'http://localhost:3000'
     */
    baseUrl?: string
  }
}

/**
 * Main configuration interface for ts-tokens
 */
export interface TokenConfig {
  /**
   * Active blockchain
   * @default 'solana'
   */
  chain: Chain

  /**
   * Network environment
   * @default 'devnet'
   */
  network: SolanaNetwork

  /**
   * Custom RPC endpoint URL (overrides network default)
   */
  rpcUrl?: string

  /**
   * Full RPC configuration (advanced)
   */
  rpc?: RpcConfig

  /**
   * Transaction commitment level
   * @default 'confirmed'
   */
  commitment: Commitment

  /**
   * Wallet configuration
   */
  wallet?: WalletConfig

  /**
   * Enable verbose logging
   * @default false
   */
  verbose: boolean

  /**
   * Dry run mode - simulate transactions without executing
   * @default false
   */
  dryRun: boolean

  /**
   * Transaction confirmation options
   */
  confirmOptions?: ConfirmOptions

  /**
   * IPFS gateway URL for fetching metadata
   * @default 'https://ipfs.io'
   */
  ipfsGateway: string

  /**
   * Arweave gateway URL for fetching metadata
   * @default 'https://arweave.net'
   */
  arweaveGateway: string

  /**
   * Storage configuration
   */
  storage?: StorageConfig

  /**
   * Default storage provider
   * @default 'arweave'
   */
  storageProvider: StorageProvider

  /**
   * Explorer URL for transaction links
   */
  explorerUrl?: string

  /**
   * Enable security checks before transactions
   * @default true
   */
  securityChecks: boolean

  /**
   * Auto-create associated token accounts when needed
   * @default true
   */
  autoCreateAccounts: boolean
}

/**
 * Partial configuration for user overrides
 */
export type TokenOptions = Partial<TokenConfig>

/**
 * Default RPC endpoints for each network
 */
export const DEFAULT_RPC_ENDPOINTS: Record<SolanaNetwork, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  'devnet': 'https://api.devnet.solana.com',
  'testnet': 'https://api.testnet.solana.com',
  'localnet': 'http://localhost:8899',
}

/**
 * Default explorer URLs for each network
 */
export const DEFAULT_EXPLORER_URLS: Record<SolanaNetwork, string> = {
  'mainnet-beta': 'https://explorer.solana.com',
  'devnet': 'https://explorer.solana.com?cluster=devnet',
  'testnet': 'https://explorer.solana.com?cluster=testnet',
  'localnet': 'https://explorer.solana.com?cluster=custom&customUrl=http://localhost:8899',
}
