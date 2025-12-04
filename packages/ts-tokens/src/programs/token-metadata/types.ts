/**
 * Token Metadata Program Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Creator info for NFT metadata
 */
export interface Creator {
  address: PublicKey
  verified: boolean
  share: number // 0-100
}

/**
 * Collection info
 */
export interface Collection {
  verified: boolean
  key: PublicKey
}

/**
 * Uses info for limited use NFTs
 */
export interface Uses {
  useMethod: UseMethod
  remaining: bigint
  total: bigint
}

export enum UseMethod {
  Burn = 0,
  Multiple = 1,
  Single = 2,
}

/**
 * Token standard enum
 */
export enum TokenStandard {
  NonFungible = 0,
  FungibleAsset = 1,
  Fungible = 2,
  NonFungibleEdition = 3,
  ProgrammableNonFungible = 4,
  ProgrammableNonFungibleEdition = 5,
}

/**
 * Data struct for metadata
 */
export interface DataV2 {
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints: number
  creators: Creator[] | null
  collection: Collection | null
  uses: Uses | null
}

/**
 * Metadata account data
 */
export interface Metadata {
  key: number
  updateAuthority: PublicKey
  mint: PublicKey
  data: DataV2
  primarySaleHappened: boolean
  isMutable: boolean
  editionNonce: number | null
  tokenStandard: TokenStandard | null
  collection: Collection | null
  uses: Uses | null
  collectionDetails: CollectionDetails | null
  programmableConfig: ProgrammableConfig | null
}

/**
 * Collection details for sized collections
 */
export interface CollectionDetails {
  size: bigint
}

/**
 * Programmable config for pNFTs
 */
export interface ProgrammableConfig {
  ruleSet: PublicKey | null
}

/**
 * Master edition account data
 */
export interface MasterEditionV2 {
  key: number
  supply: bigint
  maxSupply: bigint | null
}

/**
 * Edition account data
 */
export interface Edition {
  key: number
  parent: PublicKey
  edition: bigint
}

/**
 * Create metadata account options
 */
export interface CreateMetadataAccountV3Options {
  mint: PublicKey
  mintAuthority: PublicKey
  payer: PublicKey
  updateAuthority: PublicKey
  data: DataV2
  isMutable: boolean
  collectionDetails: CollectionDetails | null
}

/**
 * Update metadata account options
 */
export interface UpdateMetadataAccountV2Options {
  metadata: PublicKey
  updateAuthority: PublicKey
  newUpdateAuthority: PublicKey | null
  data: DataV2 | null
  primarySaleHappened: boolean | null
  isMutable: boolean | null
}

/**
 * Create master edition options
 */
export interface CreateMasterEditionV3Options {
  mint: PublicKey
  updateAuthority: PublicKey
  mintAuthority: PublicKey
  payer: PublicKey
  maxSupply: bigint | null
}

/**
 * Verify collection options
 */
export interface VerifyCollectionOptions {
  metadata: PublicKey
  collectionAuthority: PublicKey
  payer: PublicKey
  collectionMint: PublicKey
  collection: PublicKey
  collectionMasterEdition: PublicKey
}
