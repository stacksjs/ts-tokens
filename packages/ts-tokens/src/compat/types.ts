/**
 * Metaplex SDK Compatible Type Aliases
 *
 * Maps Metaplex JS SDK types to ts-tokens equivalents for migration.
 */

import type { NFTMetadata, TokenConfig } from '../types'
import type { MetaplexNft } from '../types/legacy'

/**
 * Metaplex SDK Sft type alias
 */
export type Sft = MetaplexNft

/**
 * Metaplex SDK Nft type alias (same as Sft but implies non-fungible)
 */
export type Nft = MetaplexNft

/**
 * Metaplex SDK NftWithToken type alias
 */
export interface NftWithToken extends MetaplexNft {
  token: {
    address: string
    mintAddress: string
    ownerAddress: string
    amount: number
    delegateAddress?: string | null
    state: 'initialized' | 'frozen'
  }
}

/**
 * Metaplex SDK SftWithToken type alias
 */
export type SftWithToken = NftWithToken

/**
 * Metaplex SDK Metadata type alias
 */
export interface MetaplexMetadata {
  address: string
  mintAddress: string
  updateAuthorityAddress: string
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints: number
  creators: Array<{
    address: string
    verified: boolean
    share: number
  }>
  primarySaleHappened: boolean
  isMutable: boolean
  collection?: { address: string; verified: boolean } | null
  collectionDetails?: { size: number } | null
  programmableConfig?: { ruleSet: string | null } | null
}

/**
 * Metaplex SDK FindNftByMintInput type alias
 */
export interface FindNftByMintInput {
  mintAddress: string
  loadJsonMetadata?: boolean
}

/**
 * Metaplex SDK UpdateNftInput type alias
 */
export interface UpdateNftInput {
  nftOrSft: Nft | Sft | { address: string }
  name?: string
  symbol?: string
  uri?: string
  sellerFeeBasisPoints?: number
  creators?: Array<{ address: string; share: number }>
  primarySaleHappened?: boolean
  isMutable?: boolean
  newUpdateAuthority?: string
}

/**
 * Metaplex SDK CreateNftInput type alias
 */
export interface CreateNftInput {
  name: string
  symbol?: string
  uri: string
  sellerFeeBasisPoints: number
  isCollection?: boolean
  collection?: string
  creators?: Array<{ address: string; share: number }>
  isMutable?: boolean
}

/**
 * Convert NFTMetadata to Metaplex Nft format
 */
export function toMetaplexNft(metadata: NFTMetadata): MetaplexNft {
  return {
    address: metadata.mint,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
    creators: metadata.creators || [],
    primarySaleHappened: metadata.primarySaleHappened,
    isMutable: metadata.isMutable,
    updateAuthorityAddress: metadata.updateAuthority,
    json: null,
  }
}

/**
 * Convert Metaplex Nft format to update params
 */
export function fromMetaplexUpdateInput(input: UpdateNftInput): {
  mint: string
  updates: {
    name?: string
    symbol?: string
    uri?: string
    sellerFeeBasisPoints?: number
    creators?: Array<{ address: string; share: number }>
    primarySaleHappened?: boolean
    isMutable?: boolean
  }
} {
  const nftOrSft = input.nftOrSft as { address: string }
  const address = nftOrSft.address

  return {
    mint: address,
    updates: {
      name: input.name,
      symbol: input.symbol,
      uri: input.uri,
      sellerFeeBasisPoints: input.sellerFeeBasisPoints,
      creators: input.creators,
      primarySaleHappened: input.primarySaleHappened,
      isMutable: input.isMutable,
    },
  }
}
