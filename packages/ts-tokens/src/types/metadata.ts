/**
 * Metadata Types
 *
 * Type definitions for token and NFT metadata standards.
 */

/**
 * Creator information for royalties
 */
export interface Creator {
  /**
   * Creator's wallet address
   */
  address: string

  /**
   * Whether creator has verified/signed
   */
  verified: boolean

  /**
   * Share of royalties (0-100, must sum to 100 across all creators)
   */
  share: number
}

/**
 * Collection information in metadata
 */
export interface MetadataCollection {
  /**
   * Collection mint address
   */
  key: string

  /**
   * Whether collection is verified
   */
  verified: boolean
}

/**
 * Uses/utility information for NFTs
 */
export interface Uses {
  /**
   * Use method
   */
  useMethod: 'burn' | 'multiple' | 'single'

  /**
   * Remaining uses
   */
  remaining: number

  /**
   * Total uses available
   */
  total: number
}

/**
 * On-chain metadata (Metaplex Token Metadata standard)
 */
export interface OnChainMetadata {
  /**
   * Metadata account address
   */
  address: string

  /**
   * Token mint address
   */
  mint: string

  /**
   * Update authority
   */
  updateAuthority: string

  /**
   * Token/NFT name
   */
  name: string

  /**
   * Token/NFT symbol
   */
  symbol: string

  /**
   * URI to off-chain metadata JSON
   */
  uri: string

  /**
   * Royalty in basis points (e.g., 500 = 5%)
   */
  sellerFeeBasisPoints: number

  /**
   * Creator array
   */
  creators: Creator[] | null

  /**
   * Whether primary sale has happened
   */
  primarySaleHappened: boolean

  /**
   * Whether metadata is mutable
   */
  isMutable: boolean

  /**
   * Edition nonce (for PDAs)
   */
  editionNonce: number | null

  /**
   * Token standard
   */
  tokenStandard: TokenStandard | null

  /**
   * Collection information
   */
  collection: MetadataCollection | null

  /**
   * Uses information
   */
  uses: Uses | null

  /**
   * Collection details (for collection NFTs)
   */
  collectionDetails: CollectionDetails | null

  /**
   * Programmable config (for pNFTs)
   */
  programmableConfig: ProgrammableConfig | null
}

/**
 * Token standard types
 */
export type TokenStandard =
  | 'NonFungible'
  | 'FungibleAsset'
  | 'Fungible'
  | 'NonFungibleEdition'
  | 'ProgrammableNonFungible'
  | 'ProgrammableNonFungibleEdition'

/**
 * Collection details for sized collections
 */
export interface CollectionDetails {
  /**
   * Collection version
   */
  version: 'V1' | 'V2'

  /**
   * Collection size (number of items)
   */
  size?: number

  /**
   * Padding for future use
   */
  padding?: number[]
}

/**
 * Programmable NFT configuration
 */
export interface ProgrammableConfig {
  /**
   * Rule set address
   */
  ruleSet: string | null
}

/**
 * Off-chain metadata JSON structure (Metaplex standard)
 */
export interface OffChainMetadata {
  /**
   * Asset name
   */
  name: string

  /**
   * Asset symbol
   */
  symbol: string

  /**
   * Asset description
   */
  description: string

  /**
   * Image URL
   */
  image: string

  /**
   * Animation URL (for video/audio NFTs)
   */
  animation_url?: string

  /**
   * External URL
   */
  external_url?: string

  /**
   * Attributes/traits
   */
  attributes?: MetadataAttribute[]

  /**
   * Properties (files, category, creators)
   */
  properties?: MetadataProperties

  /**
   * Seller fee basis points
   */
  seller_fee_basis_points?: number

  /**
   * Collection information
   */
  collection?: {
    name: string
    family?: string
  }
}

/**
 * Metadata attribute (trait)
 */
export interface MetadataAttribute {
  /**
   * Trait type/name
   */
  trait_type: string

  /**
   * Trait value
   */
  value: string | number

  /**
   * Display type (for numeric values)
   */
  display_type?: 'number' | 'boost_number' | 'boost_percentage' | 'date'

  /**
   * Maximum value (for numeric traits)
   */
  max_value?: number
}

/**
 * Metadata properties
 */
export interface MetadataProperties {
  /**
   * Associated files
   */
  files?: MetadataFile[]

  /**
   * Category
   */
  category?: 'image' | 'video' | 'audio' | 'vr' | 'html'

  /**
   * Creators
   */
  creators?: Array<{
    address: string
    share: number
  }>
}

/**
 * Metadata file reference
 */
export interface MetadataFile {
  /**
   * File URI
   */
  uri: string

  /**
   * MIME type
   */
  type: string

  /**
   * CDN URI (optional)
   */
  cdn?: boolean
}

/**
 * Master edition information
 */
export interface MasterEditionInfo {
  /**
   * Master edition account address
   */
  address: string

  /**
   * Token mint address
   */
  mint: string

  /**
   * Current supply (editions printed)
   */
  supply: number

  /**
   * Maximum supply (null = unlimited)
   */
  maxSupply: number | null

  /**
   * Edition type
   */
  type: 'MasterEditionV1' | 'MasterEditionV2'
}

/**
 * Edition information (for prints)
 */
export interface EditionInfo {
  /**
   * Edition account address
   */
  address: string

  /**
   * Token mint address
   */
  mint: string

  /**
   * Parent master edition mint
   */
  parent: string

  /**
   * Edition number
   */
  edition: number
}

/**
 * Metadata upload options
 */
export interface MetadataUploadOptions {
  /**
   * Asset name
   */
  name: string

  /**
   * Asset symbol
   */
  symbol: string

  /**
   * Asset description
   */
  description: string

  /**
   * Image file path or URL
   */
  image: string

  /**
   * Animation file path or URL (optional)
   */
  animationUrl?: string

  /**
   * External URL
   */
  externalUrl?: string

  /**
   * Attributes/traits
   */
  attributes?: MetadataAttribute[]

  /**
   * Seller fee in basis points
   */
  sellerFeeBasisPoints?: number

  /**
   * Creators
   */
  creators?: Array<{
    address: string
    share: number
  }>

  /**
   * Collection info
   */
  collection?: {
    name: string
    family?: string
  }

  /**
   * Additional properties
   */
  properties?: Record<string, unknown>
}

/**
 * Metadata validation result
 */
export interface MetadataValidation {
  /**
   * Whether metadata is valid
   */
  valid: boolean

  /**
   * Validation errors
   */
  errors: string[]

  /**
   * Validation warnings
   */
  warnings: string[]
}
