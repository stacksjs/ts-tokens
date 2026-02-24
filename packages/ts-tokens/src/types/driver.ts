/**
 * Chain Driver Interface Types
 *
 * Defines the interface that all blockchain drivers must implement.
 */

import type { Commitment, TokenConfig } from './config'
import type { CreateTokenOptions, MintOptions, BurnOptions, TokenInfo, TokenAccountInfo } from './token'
import type { CreateCollectionOptions, MintNFTOptions, NFTInfo, CollectionInfo } from './nft'
import type { TransactionResult, TransactionOptions } from './transaction'

/**
 * Connection interface for blockchain RPC
 */
export interface ChainConnection {
  /**
   * RPC endpoint URL
   */
  endpoint: string

  /**
   * Current commitment level
   */
  commitment: Commitment

  /**
   * Check if connection is active
   */
  isConnected(): boolean

  /**
   * Get the latest blockhash
   */
  getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }>
}

/**
 * Token creation result
 */
export interface TokenResult {
  /**
   * Token mint address
   */
  mint: string

  /**
   * Transaction signature
   */
  signature: string

  /**
   * Metadata account address (if created)
   */
  metadataAddress?: string
}

/**
 * Collection creation result
 */
export interface CollectionResult {
  /**
   * Collection mint address
   */
  mint: string

  /**
   * Transaction signature
   */
  signature: string

  /**
   * Metadata account address
   */
  metadata: string

  /**
   * Master edition address
   */
  masterEdition: string

  /**
   * Metadata URI
   */
  uri: string
}

/**
 * NFT minting result
 */
export interface NFTResult {
  /**
   * NFT mint address
   */
  mint: string

  /**
   * Transaction signature
   */
  signature: string

  /**
   * Metadata account address
   */
  metadata: string

  /**
   * Master edition address (for 1/1 NFTs)
   */
  masterEdition?: string

  /**
   * Metadata URI
   */
  uri: string

  /**
   * Edition number (for prints)
   */
  edition?: number
}

/**
 * Transfer options
 */
export interface TransferOptions {
  /**
   * Token mint address
   */
  mint: string

  /**
   * Source address (token account or owner)
   */
  from: string

  /**
   * Destination address
   */
  to: string

  /**
   * Amount to transfer (in base units for fungible, 1 for NFT)
   */
  amount: bigint | number

  /**
   * Transaction options
   */
  options?: TransactionOptions
}

/**
 * Authority types for tokens
 */
export type AuthorityType = 'mint' | 'freeze' | 'update' | 'close'

/**
 * Authority management options
 */
export interface SetAuthorityOptions {
  /**
   * Token mint address
   */
  mint: string

  /**
   * Type of authority to change
   */
  authorityType: AuthorityType

  /**
   * Current authority (signer)
   */
  currentAuthority: string

  /**
   * New authority (null to revoke)
   */
  newAuthority: string | null
}

/**
 * Chain driver interface
 *
 * All blockchain implementations must implement this interface.
 */
export interface ChainDriver {
  /**
   * Driver name (e.g., 'solana')
   */
  readonly name: string

  /**
   * Current configuration
   */
  readonly config: TokenConfig

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Establish connection to the blockchain
   */
  connect(): Promise<ChainConnection>

  /**
   * Disconnect from the blockchain
   */
  disconnect(): Promise<void>

  /**
   * Get current connection
   */
  getConnection(): ChainConnection | null

  /**
   * Check if connected
   */
  isConnected(): boolean

  // ============================================
  // Account Queries
  // ============================================

  /**
   * Get native token balance (e.g., SOL)
   */
  getBalance(address: string): Promise<bigint>

  /**
   * Get token balance for a specific mint
   */
  getTokenBalance(owner: string, mint: string): Promise<bigint>

  /**
   * Get all token accounts for an owner
   */
  getTokenAccounts(owner: string): Promise<TokenAccountInfo[]>

  // ============================================
  // Fungible Token Operations
  // ============================================

  /**
   * Create a new fungible token
   */
  createToken(options: CreateTokenOptions): Promise<TokenResult>

  /**
   * Mint tokens to an address
   */
  mintTokens(options: MintOptions): Promise<TransactionResult>

  /**
   * Transfer tokens
   */
  transferTokens(options: TransferOptions): Promise<TransactionResult>

  /**
   * Burn tokens
   */
  burnTokens(options: BurnOptions): Promise<TransactionResult>

  /**
   * Get token information
   */
  getTokenInfo(mint: string): Promise<TokenInfo>

  /**
   * Set or revoke token authority
   */
  setAuthority(options: SetAuthorityOptions): Promise<TransactionResult>

  // ============================================
  // NFT Operations
  // ============================================

  /**
   * Create an NFT collection
   */
  createCollection(options: CreateCollectionOptions): Promise<CollectionResult>

  /**
   * Mint a single NFT
   */
  mintNFT(options: MintNFTOptions): Promise<NFTResult>

  /**
   * Transfer an NFT
   */
  transferNFT(options: TransferOptions): Promise<TransactionResult>

  /**
   * Burn an NFT
   */
  burnNFT(mint: string, owner: string): Promise<TransactionResult>

  /**
   * Get NFT information
   */
  getNFTInfo(mint: string): Promise<NFTInfo>

  /**
   * Get collection information
   */
  getCollectionInfo(mint: string): Promise<CollectionInfo>

  /**
   * Get all NFTs owned by an address
   */
  getNFTsByOwner(owner: string): Promise<NFTInfo[]>

  /**
   * Get all NFTs in a collection
   */
  getNFTsByCollection(collection: string): Promise<NFTInfo[]>

  /**
   * Verify an NFT belongs to a collection
   */
  verifyCollection(nft: string, collection: string): Promise<TransactionResult>

  // ============================================
  // Transaction Utilities
  // ============================================

  /**
   * Simulate a transaction without executing
   */
  simulateTransaction(transaction: unknown): Promise<{
    success: boolean
    logs: string[]
    error?: string
    unitsConsumed?: number
  }>

  /**
   * Get transaction status
   */
  getTransactionStatus(signature: string): Promise<{
    confirmed: boolean
    slot?: number
    error?: string
  }>

  /**
   * Request airdrop (devnet/testnet only)
   */
  requestAirdrop(address: string, amount: number): Promise<string>
}

/**
 * Driver factory function type
 */
export type DriverFactory = (_config: TokenConfig) => ChainDriver

/**
 * Driver registry for managing multiple chain drivers
 */
export interface DriverRegistry {
  /**
   * Register a driver factory
   */
  register(chain: string, factory: DriverFactory): void

  /**
   * Get a driver instance for a chain
   */
  get(chain: string, config: TokenConfig): ChainDriver

  /**
   * Check if a driver is registered
   */
  has(chain: string): boolean

  /**
   * List all registered chains
   */
  list(): string[]
}
