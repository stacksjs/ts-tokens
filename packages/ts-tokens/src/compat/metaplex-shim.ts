/**
 * Metaplex SDK Compatibility Shim
 *
 * Provides a 1:1 API mapping from the Metaplex JS SDK to ts-tokens.
 * This allows gradual migration from @metaplex-foundation/js to ts-tokens.
 *
 * Usage:
 * ```ts
 * import { Metaplex } from 'ts-tokens/compat'
 *
 * const metaplex = Metaplex(config)
 * const nft = await metaplex.nfts().findByMint({ mintAddress: '...' })
 * ```
 */

import type { TokenConfig, TransactionResult, NFTMetadata } from '../types'
import type { MetaplexNft } from '../types/legacy'
import type {
  Nft,
  FindNftByMintInput,
  UpdateNftInput,
  CreateNftInput,
} from './types'
import { toMetaplexNft, fromMetaplexUpdateInput } from './types'

/**
 * Metaplex-compatible NFT operations interface
 */
export interface MetaplexNftClient {
  /** Find an NFT by its mint address */
  findByMint(input: FindNftByMintInput): Promise<Nft | null>

  /** Find all NFTs by owner */
  findAllByOwner(input: { owner: string }): Promise<Nft[]>

  /** Find all NFTs by creator */
  findAllByCreator(input: { creator: string }): Promise<Nft[]>

  /** Find all NFTs in a collection */
  findAllByCollection(input: { collection: string }): Promise<Nft[]>

  /** Update an NFT */
  update(input: UpdateNftInput): Promise<TransactionResult>

  /** Create an NFT */
  create(input: CreateNftInput): Promise<{ nft: Nft; signature: string }>

  /** Delete (burn) an NFT */
  delete(input: { mintAddress: string }): Promise<TransactionResult>
}

/**
 * Create a Metaplex-compatible API facade
 *
 * Maps the Metaplex JS SDK API surface to ts-tokens functions.
 */
export function Metaplex(config: TokenConfig) {
  return {
    /**
     * NFT operations namespace
     */
    nfts(): MetaplexNftClient {
      return {
        async findByMint(input: FindNftByMintInput): Promise<Nft | null> {
          const { getNFTMetadata, fetchOffChainMetadata } = await import('../nft/metadata')

          const metadata = await getNFTMetadata(input.mintAddress, config)
          if (!metadata) return null

          const nft = toMetaplexNft(metadata)

          if (input.loadJsonMetadata !== false) {
            const json = await fetchOffChainMetadata(metadata.uri)
            nft.json = json
          }

          return nft
        },

        async findAllByOwner(input: { owner: string }): Promise<Nft[]> {
          const { getNFTsByOwner } = await import('../nft/query')
          const nfts = await getNFTsByOwner(input.owner, config)
          return nfts.map(toMetaplexNft)
        },

        async findAllByCreator(input: { creator: string }): Promise<Nft[]> {
          const { getNFTsByCreator } = await import('../nft/query')
          const nfts = await getNFTsByCreator(input.creator, config)
          return nfts.map(toMetaplexNft)
        },

        async findAllByCollection(input: { collection: string }): Promise<Nft[]> {
          const { getNFTsByCollection } = await import('../nft/query')
          const nfts = await getNFTsByCollection(input.collection, config)
          return nfts.map(toMetaplexNft)
        },

        async update(input: UpdateNftInput): Promise<TransactionResult> {
          const { updateNFTMetadata } = await import('../nft/metadata')
          const { mint, updates } = fromMetaplexUpdateInput(input)
          return updateNFTMetadata(mint, updates, config)
        },

        async create(input: CreateNftInput): Promise<{ nft: Nft; signature: string }> {
          if (input.isCollection) {
            const { createCollection } = await import('../nft/create')
            const result = await createCollection({
              name: input.name,
              symbol: input.symbol || '',
              uri: input.uri,
              sellerFeeBasisPoints: input.sellerFeeBasisPoints,
            }, config)

            const nft: Nft = {
              address: result.mint,
              name: input.name,
              symbol: input.symbol || '',
              uri: input.uri,
              sellerFeeBasisPoints: input.sellerFeeBasisPoints,
              creators: (input.creators || []).map(c => ({ ...c, verified: false })),
              primarySaleHappened: false,
              isMutable: input.isMutable ?? true,
              updateAuthorityAddress: '',
              json: null,
            }

            return { nft, signature: result.signature }
          }

          const { createNFT } = await import('../nft/create')
          const result = await createNFT({
            name: input.name,
            symbol: input.symbol || '',
            uri: input.uri,
            collection: input.collection,
            sellerFeeBasisPoints: input.sellerFeeBasisPoints,
          }, config)

          const nft: Nft = {
            address: result.mint,
            name: input.name,
            symbol: input.symbol || '',
            uri: input.uri,
            sellerFeeBasisPoints: input.sellerFeeBasisPoints,
            creators: (input.creators || []).map(c => ({ ...c, verified: false })),
            primarySaleHappened: false,
            isMutable: input.isMutable ?? true,
            updateAuthorityAddress: '',
            json: null,
          }

          return { nft, signature: result.signature }
        },

        async delete(input: { mintAddress: string }): Promise<TransactionResult> {
          const { burnNFTFull } = await import('../nft/burn')
          return burnNFTFull(input.mintAddress, config)
        },
      }
    },
  }
}
