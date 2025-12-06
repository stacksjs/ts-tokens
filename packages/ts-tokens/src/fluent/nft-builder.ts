/**
 * NFT Builder
 *
 * Fluent API for NFT operations.
 */

import type { PublicKey, TransactionInstruction } from '@solana/web3.js'
import type {
  CollectionCreationParams,
  MetadataUpdateParams,
  NFTCreationParams,
} from './types'
import { BaseBuilder } from './builder'

/**
 * Fluent NFT builder
 *
 * @example
 * ```ts
 * const result = await NFTBuilder.create()
 *   .createCollection({ name: 'My Collection', symbol: 'MCOL', uri: '...' })
 *   .mintNFT({ name: 'NFT #1', symbol: 'NFT', uri: '...' })
 *   .mintNFT({ name: 'NFT #2', symbol: 'NFT', uri: '...' })
 *   .withConnection(connection)
 *   .withPayer(payer)
 *   .execute()
 * ```
 */
export class NFTBuilder extends BaseBuilder<NFTBuilder> {
  private collectionAddress: PublicKey | null = null
  private nftAddresses: PublicKey[] = []

  /**
   * Create a new NFT builder
   */
  static create(): NFTBuilder {
    return new NFTBuilder()
  }

  /**
   * Create a new collection
   */
  createCollection(params: CollectionCreationParams): NFTBuilder {
    return this.addOperation('createCollection', {
      name: params.name,
      symbol: params.symbol,
      uri: params.uri,
      sellerFeeBasisPoints: params.sellerFeeBasisPoints ?? 0,
    })
  }

  /**
   * Use existing collection
   */
  useCollection(collection: PublicKey): NFTBuilder {
    this.collectionAddress = collection
    return this.addOperation('useCollection', { collection: collection.toBase58() })
  }

  /**
   * Mint a new NFT
   */
  mintNFT(params: NFTCreationParams): NFTBuilder {
    return this.addOperation('mintNFT', {
      name: params.name,
      symbol: params.symbol,
      uri: params.uri,
      sellerFeeBasisPoints: params.sellerFeeBasisPoints ?? 500,
      creators: params.creators?.map(c => ({
        address: c.address.toBase58(),
        share: c.share,
      })),
      collection: params.collection?.toBase58() ?? this.collectionAddress?.toBase58(),
    })
  }

  /**
   * Mint multiple NFTs
   */
  mintNFTs(items: NFTCreationParams[]): NFTBuilder {
    for (const item of items) {
      this.mintNFT(item)
    }
    return this
  }

  /**
   * Transfer NFT
   */
  transfer(mint: PublicKey, to: PublicKey): NFTBuilder {
    return this.addOperation('transfer', {
      mint: mint.toBase58(),
      to: to.toBase58(),
    })
  }

  /**
   * Transfer multiple NFTs
   */
  transferMany(transfers: Array<{ mint: PublicKey, to: PublicKey }>): NFTBuilder {
    for (const t of transfers) {
      this.transfer(t.mint, t.to)
    }
    return this
  }

  /**
   * Burn NFT
   */
  burn(mint: PublicKey): NFTBuilder {
    return this.addOperation('burn', { mint: mint.toBase58() })
  }

  /**
   * Burn multiple NFTs
   */
  burnMany(mints: PublicKey[]): NFTBuilder {
    for (const mint of mints) {
      this.burn(mint)
    }
    return this
  }

  /**
   * Update metadata
   */
  updateMetadata(mint: PublicKey, params: MetadataUpdateParams): NFTBuilder {
    return this.addOperation('updateMetadata', {
      mint: mint.toBase58(),
      ...params,
    })
  }

  /**
   * Verify creator
   */
  verifyCreator(mint: PublicKey, creator: PublicKey): NFTBuilder {
    return this.addOperation('verifyCreator', {
      mint: mint.toBase58(),
      creator: creator.toBase58(),
    })
  }

  /**
   * Set and verify collection
   */
  setCollection(mint: PublicKey, collection: PublicKey): NFTBuilder {
    return this.addOperation('setCollection', {
      mint: mint.toBase58(),
      collection: collection.toBase58(),
    })
  }

  /**
   * Unverify collection
   */
  unverifyCollection(mint: PublicKey): NFTBuilder {
    return this.addOperation('unverifyCollection', { mint: mint.toBase58() })
  }

  /**
   * Freeze NFT (delegate)
   */
  freeze(mint: PublicKey): NFTBuilder {
    return this.addOperation('freeze', { mint: mint.toBase58() })
  }

  /**
   * Thaw NFT
   */
  thaw(mint: PublicKey): NFTBuilder {
    return this.addOperation('thaw', { mint: mint.toBase58() })
  }

  /**
   * Build transaction instructions
   */
  async build(): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = []

    for (const op of this.operations) {
      // In production, would build actual instructions
      switch (op.type) {
        case 'createCollection':
          // Would call createCollection instruction builder
          break
        case 'mintNFT':
          // Would call mintNFT instruction builder
          break
        case 'transfer':
          // Would call transfer instruction builder
          break
        case 'burn':
          // Would call burn instruction builder
          break
        case 'updateMetadata':
          // Would call updateMetadata instruction builder
          break
        // ... other operations
      }
    }

    return instructions
  }

  /**
   * Get collection address
   */
  getCollection(): PublicKey | null {
    return this.collectionAddress
  }

  /**
   * Get minted NFT addresses
   */
  getMintedNFTs(): PublicKey[] {
    return [...this.nftAddresses]
  }
}

/**
 * Create NFT builder shorthand
 */
export function nfts(): NFTBuilder {
  return NFTBuilder.create()
}

/**
 * Candy Machine builder
 */
export class CandyMachineBuilder extends BaseBuilder<CandyMachineBuilder> {
  private candyMachineAddress: PublicKey | null = null

  static create(): CandyMachineBuilder {
    return new CandyMachineBuilder()
  }

  /**
   * Set name
   */
  name(name: string): CandyMachineBuilder {
    return this.addOperation('setName', { name })
  }

  /**
   * Set symbol
   */
  symbol(symbol: string): CandyMachineBuilder {
    return this.addOperation('setSymbol', { symbol })
  }

  /**
   * Set item count
   */
  items(count: number): CandyMachineBuilder {
    return this.addOperation('setItems', { count })
  }

  /**
   * Set price
   */
  price(amount: number): CandyMachineBuilder {
    return this.addOperation('setPrice', { amount })
  }

  /**
   * Set start date
   */
  startDate(date: Date): CandyMachineBuilder {
    return this.addOperation('setStartDate', { timestamp: date.getTime() })
  }

  /**
   * Set end date
   */
  endDate(date: Date): CandyMachineBuilder {
    return this.addOperation('setEndDate', { timestamp: date.getTime() })
  }

  /**
   * Add guard
   */
  addGuard(type: string, config: unknown): CandyMachineBuilder {
    return this.addOperation('addGuard', { type, config })
  }

  /**
   * Set seller fee
   */
  sellerFeeBasisPoints(bps: number): CandyMachineBuilder {
    return this.addOperation('setSellerFee', { bps })
  }

  /**
   * Set creators
   */
  creators(creators: Array<{ address: PublicKey, share: number }>): CandyMachineBuilder {
    return this.addOperation('setCreators', {
      creators: creators.map(c => ({
        address: c.address.toBase58(),
        share: c.share,
      })),
    })
  }

  /**
   * Build transaction instructions
   */
  async build(): Promise<TransactionInstruction[]> {
    // In production, would build candy machine creation instructions
    return []
  }
}

/**
 * Create Candy Machine builder shorthand
 */
export function candyMachine(): CandyMachineBuilder {
  return CandyMachineBuilder.create()
}
