/**
 * Solana Chain Driver
 *
 * A `ChainDriver` implementation that delegates to the existing Solana
 * modules (drivers/solana/*, token/*, nft/*). Registered in the driver
 * registry at module init (see ../index.ts), so `getDriver('solana', config)`
 * and `autoDetectDriver(config)` work out of the box.
 *
 * Token/NFT modules are imported lazily inside methods: they themselves
 * depend on drivers/solana/*, and lazy imports keep module initialization
 * free of cycles.
 */

import { PublicKey } from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import type {
  ChainConnection,
  ChainDriver,
  CollectionInfo,
  CollectionResult,
  Commitment,
  CreateCollectionOptions,
  CreateTokenOptions,
  MasterEditionInfo,
  MintNFTOptions,
  MintOptions,
  BurnOptions,
  NFTInfo,
  NFTMetadata,
  NFTResult,
  OnChainMetadata,
  SetAuthorityOptions,
  TokenAccountInfo,
  TokenConfig,
  TokenInfo,
  TokenResult,
  TransactionResult,
  TransferOptions,
} from '../../types'
import { createConnection, getRpcUrl } from './connection'
import {
  getBalance as solGetBalance,
  getTokenBalance as solGetTokenBalance,
  getTokenAccounts as solGetTokenAccounts,
  getMintInfo,
} from './account'
import {
  simulateTransaction as solSimulateTransaction,
  getTransactionStatus as solGetTransactionStatus,
} from './transaction'

/**
 * Map the query-layer NFTMetadata shape onto the driver-layer
 * OnChainMetadata shape (fields that the query layer does not fetch are
 * filled with null defaults).
 */
function toOnChainMetadata(m: NFTMetadata): OnChainMetadata {
  return {
    address: m.metadataAddress,
    mint: m.mint,
    updateAuthority: m.updateAuthority,
    name: m.name,
    symbol: m.symbol,
    uri: m.uri,
    sellerFeeBasisPoints: m.sellerFeeBasisPoints,
    creators: m.creators ?? null,
    primarySaleHappened: m.primarySaleHappened,
    isMutable: m.isMutable,
    editionNonce: null,
    tokenStandard: null,
    collection: null,
    uses: null,
    collectionDetails: null,
    programmableConfig: null,
  }
}

function toNFTInfo(m: NFTMetadata, owner: string): NFTInfo {
  return {
    mint: m.mint,
    owner,
    metadata: toOnChainMetadata(m),
    isFrozen: false,
    tokenStandard: 'NonFungible',
    isCompressed: false,
  }
}

/**
 * ChainConnection adapter over a web3.js Connection.
 */
class SolanaChainConnection implements ChainConnection {
  constructor(
    public readonly endpoint: string,
    public readonly commitment: Commitment,
    private readonly connection: Connection,
  ) {}

  isConnected(): boolean {
    // web3.js Connection is a stateless HTTP client — being "connected"
    // means the object exists. Use checkConnectionHealth() for a live probe.
    return true
  }

  async getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    return this.connection.getLatestBlockhash()
  }
}

/**
 * Solana implementation of the ChainDriver interface.
 */
export class SolanaDriver implements ChainDriver {
  readonly name = 'solana'
  readonly config: TokenConfig

  private connection: Connection | null = null

  constructor(config: TokenConfig) {
    this.config = config
  }

  // ============================================
  // Connection Management
  // ============================================

  private getOrCreateConnection(): Connection {
    if (!this.connection) {
      this.connection = createConnection(this.config)
    }
    return this.connection
  }

  async connect(): Promise<ChainConnection> {
    const connection = this.getOrCreateConnection()
    return new SolanaChainConnection(
      getRpcUrl(this.config.network, this.config.rpcUrl),
      this.config.commitment,
      connection,
    )
  }

  async disconnect(): Promise<void> {
    this.connection = null
  }

  getConnection(): ChainConnection | null {
    if (!this.connection) return null
    return new SolanaChainConnection(
      getRpcUrl(this.config.network, this.config.rpcUrl),
      this.config.commitment,
      this.connection,
    )
  }

  isConnected(): boolean {
    return this.connection !== null
  }

  // ============================================
  // Account Queries
  // ============================================

  async getBalance(address: string): Promise<bigint> {
    return solGetBalance(this.getOrCreateConnection(), address)
  }

  async getTokenBalance(owner: string, mint: string): Promise<bigint> {
    return solGetTokenBalance(this.getOrCreateConnection(), owner, mint)
  }

  async getTokenAccounts(owner: string): Promise<TokenAccountInfo[]> {
    return solGetTokenAccounts(this.getOrCreateConnection(), owner)
  }

  // ============================================
  // Fungible Token Operations
  // ============================================

  async createToken(options: CreateTokenOptions): Promise<TokenResult> {
    const { createToken } = await import('../../token/create')
    return createToken(options, this.config)
  }

  async mintTokens(options: MintOptions): Promise<TransactionResult> {
    const { mintTokens } = await import('../../token/mint')
    return mintTokens(options, this.config)
  }

  async transferTokens(options: TransferOptions): Promise<TransactionResult> {
    const { transfer } = await import('../../token/transfer')
    return transfer(options.mint, options.to, options.amount, this.config)
  }

  async burnTokens(options: BurnOptions): Promise<TransactionResult> {
    const { burn } = await import('../../token/burn')
    return burn(options.mint, options.amount, this.config)
  }

  async getTokenInfo(mint: string): Promise<TokenInfo> {
    const connection = this.getOrCreateConnection()
    const info = await getMintInfo(connection, mint)
    const { getMintWithProgram } = await import('../../token/program')
    const { TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token')
    const { programId } = await getMintWithProgram(connection, new PublicKey(mint))

    return {
      mint: info.address,
      supply: info.supply,
      decimals: info.decimals,
      mintAuthority: info.mintAuthority,
      freezeAuthority: info.freezeAuthority,
      isToken2022: programId.equals(TOKEN_2022_PROGRAM_ID),
    }
  }

  async setAuthority(options: SetAuthorityOptions): Promise<TransactionResult> {
    const authority = await import('../../token/authority')

    switch (options.authorityType) {
      case 'mint':
        return options.newAuthority === null
          ? authority.revokeMintAuthority(options.mint, this.config)
          : authority.setMintAuthority(options.mint, options.newAuthority, this.config)
      case 'freeze':
        return options.newAuthority === null
          ? authority.revokeFreezeAuthority(options.mint, this.config)
          : authority.setFreezeAuthority(options.mint, options.newAuthority, this.config)
      default:
        throw new Error(
          `SolanaDriver.setAuthority: authority type "${options.authorityType}" is not ` +
          'supported for SPL tokens (only "mint" and "freeze" exist on a mint).',
        )
    }
  }

  // ============================================
  // NFT Operations
  // ============================================

  async createCollection(options: CreateCollectionOptions): Promise<CollectionResult> {
    const { createCollection } = await import('../../nft/create')
    return createCollection(options, this.config)
  }

  async mintNFT(options: MintNFTOptions): Promise<NFTResult> {
    const { mintNFT } = await import('../../nft/create')
    return mintNFT(options.name, options.uri, this.config)
  }

  async transferNFT(options: TransferOptions): Promise<TransactionResult> {
    const { transferNFT } = await import('../../nft/transfer')
    return transferNFT(options.mint, options.to, this.config)
  }

  async burnNFT(mint: string, _owner: string): Promise<TransactionResult> {
    // The owner is implicit: the configured wallet must hold the NFT.
    const { burnNFT } = await import('../../nft/burn')
    return burnNFT(mint, this.config)
  }

  async getNFTInfo(mint: string): Promise<NFTInfo> {
    const { getNFTMetadata } = await import('../../nft/metadata')
    const { getNFTHolder } = await import('../../nft/query')

    const metadata = await getNFTMetadata(mint, this.config)
    if (!metadata) {
      throw new Error(`NFT not found (no metadata account): ${mint}`)
    }
    const owner = await getNFTHolder(mint, this.config)
    return toNFTInfo(metadata, owner ?? '')
  }

  async getCollectionInfo(mint: string): Promise<CollectionInfo> {
    const { getNFTMetadata } = await import('../../nft/metadata')
    const { deserializeMasterEdition } = await import('../../programs/token-metadata/accounts')

    const metadata = await getNFTMetadata(mint, this.config)
    if (!metadata) {
      throw new Error(`Collection not found (no metadata account): ${mint}`)
    }

    // A collection NFT always has a MasterEdition PDA — fetch it so the
    // returned CollectionInfo carries real supply data.
    const connection = this.getOrCreateConnection()
    const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    const mintPubkey = new PublicKey(mint)
    const [editionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer(), Buffer.from('edition')],
      METADATA_PROGRAM_ID,
    )
    const editionAccount = await connection.getAccountInfo(editionPda)
    if (!editionAccount) {
      throw new Error(`Not a collection NFT (no master edition account): ${mint}`)
    }
    const edition = deserializeMasterEdition(editionAccount.data as Buffer)

    const masterEdition: MasterEditionInfo = {
      address: editionPda.toBase58(),
      mint,
      supply: Number(edition.supply),
      maxSupply: edition.maxSupply === null ? null : Number(edition.maxSupply),
      type: 'MasterEditionV2',
    }

    return {
      mint,
      metadata: toOnChainMetadata(metadata),
      masterEdition,
      updateAuthority: metadata.updateAuthority,
      isMutable: metadata.isMutable,
    }
  }

  async getNFTsByOwner(owner: string): Promise<NFTInfo[]> {
    const { getNFTsByOwner } = await import('../../nft/query')
    const nfts = await getNFTsByOwner(owner, this.config)
    return nfts.map(m => toNFTInfo(m, owner))
  }

  async getNFTsByCollection(collection: string): Promise<NFTInfo[]> {
    // Delegates to the query layer, which requires the DAS API and throws an
    // explanatory error when only plain RPC is available.
    const { getNFTsByCollection } = await import('../../nft/query')
    const nfts = await getNFTsByCollection(collection, this.config)
    return nfts.map(m => toNFTInfo(m, ''))
  }

  async verifyCollection(nft: string, collection: string): Promise<TransactionResult> {
    const { verifyCollectionItem } = await import('../../nft/collection')
    return verifyCollectionItem(nft, collection, this.config)
  }

  // ============================================
  // Transaction Utilities
  // ============================================

  async simulateTransaction(transaction: unknown): Promise<{
    success: boolean
    logs: string[]
    error?: string
    unitsConsumed?: number
  }> {
    const result = await solSimulateTransaction(
      this.getOrCreateConnection(),
      transaction as Parameters<typeof solSimulateTransaction>[1],
    )
    return {
      success: result.success,
      logs: result.logs,
      error: result.error,
      unitsConsumed: result.unitsConsumed,
    }
  }

  async getTransactionStatus(signature: string): Promise<{
    confirmed: boolean
    slot?: number
    error?: string
  }> {
    return solGetTransactionStatus(this.getOrCreateConnection(), signature)
  }

  async requestAirdrop(address: string, amount: number): Promise<string> {
    return this.getOrCreateConnection().requestAirdrop(new PublicKey(address), amount)
  }
}
