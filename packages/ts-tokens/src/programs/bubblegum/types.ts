/**
 * Bubblegum Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Metadata args for minting compressed NFT
 */
export interface MetadataArgs {
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints: number
  primarySaleHappened: boolean
  isMutable: boolean
  editionNonce: number | null
  tokenStandard: TokenStandard | null
  collection: Collection | null
  uses: Uses | null
  tokenProgramVersion: TokenProgramVersion
  creators: Creator[]
}

/**
 * Creator info
 */
export interface Creator {
  address: PublicKey
  verified: boolean
  share: number
}

/**
 * Collection info
 */
export interface Collection {
  verified: boolean
  key: PublicKey
}

/**
 * Uses info
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

export enum TokenStandard {
  NonFungible = 0,
  FungibleAsset = 1,
  Fungible = 2,
  NonFungibleEdition = 3,
}

export enum TokenProgramVersion {
  Original = 0,
  Token2022 = 1,
}

/**
 * Leaf schema for Merkle tree
 */
export interface LeafSchema {
  id: PublicKey
  owner: PublicKey
  delegate: PublicKey
  nonce: bigint
  dataHash: Uint8Array
  creatorHash: Uint8Array
}

/**
 * Create tree options
 */
export interface CreateTreeOptions {
  merkleTree: PublicKey
  treeAuthority: PublicKey
  payer: PublicKey
  treeCreator: PublicKey
  maxDepth: number
  maxBufferSize: number
  canopyDepth?: number
  public?: boolean
}

/**
 * Mint V1 options
 */
export interface MintV1Options {
  merkleTree: PublicKey
  treeAuthority: PublicKey
  leafOwner: PublicKey
  leafDelegate: PublicKey
  payer: PublicKey
  treeDelegate: PublicKey
  metadata: MetadataArgs
}

/**
 * Mint to collection options
 */
export interface MintToCollectionOptions extends MintV1Options {
  collectionMint: PublicKey
  collectionMetadata: PublicKey
  collectionMasterEdition: PublicKey
  collectionAuthority: PublicKey
  collectionAuthorityRecordPda?: PublicKey
}

/**
 * Transfer options
 */
export interface TransferOptions {
  merkleTree: PublicKey
  treeAuthority: PublicKey
  leafOwner: PublicKey
  leafDelegate: PublicKey
  newLeafOwner: PublicKey
  root: Uint8Array
  dataHash: Uint8Array
  creatorHash: Uint8Array
  nonce: bigint
  index: number
  proof: PublicKey[]
}

/**
 * Burn options
 */
export interface BurnOptions {
  merkleTree: PublicKey
  treeAuthority: PublicKey
  leafOwner: PublicKey
  leafDelegate: PublicKey
  root: Uint8Array
  dataHash: Uint8Array
  creatorHash: Uint8Array
  nonce: bigint
  index: number
  proof: PublicKey[]
}

/**
 * Delegate options
 */
export interface DelegateOptions {
  merkleTree: PublicKey
  treeAuthority: PublicKey
  leafOwner: PublicKey
  previousLeafDelegate: PublicKey
  newLeafDelegate: PublicKey
  root: Uint8Array
  dataHash: Uint8Array
  creatorHash: Uint8Array
  nonce: bigint
  index: number
  proof: PublicKey[]
}

/**
 * Redeem options
 */
export interface RedeemOptions {
  merkleTree: PublicKey
  treeAuthority: PublicKey
  leafOwner: PublicKey
  leafDelegate: PublicKey
  voucher: PublicKey
  root: Uint8Array
  dataHash: Uint8Array
  creatorHash: Uint8Array
  nonce: bigint
  index: number
  proof: PublicKey[]
}

/**
 * Cancel redeem options
 */
export interface CancelRedeemOptions {
  merkleTree: PublicKey
  treeAuthority: PublicKey
  leafOwner: PublicKey
  voucher: PublicKey
  root: Uint8Array
  dataHash: Uint8Array
  creatorHash: Uint8Array
  nonce: bigint
  index: number
  proof: PublicKey[]
}

/**
 * Decompress options
 */
export interface DecompressOptions {
  merkleTree: PublicKey
  treeAuthority: PublicKey
  leafOwner: PublicKey
  leafDelegate: PublicKey
  mint: PublicKey
  mintAuthority: PublicKey
  metadata: PublicKey
  masterEdition: PublicKey
  tokenAccount: PublicKey
  root: Uint8Array
  dataHash: Uint8Array
  creatorHash: Uint8Array
  nonce: bigint
  index: number
  proof: PublicKey[]
}
