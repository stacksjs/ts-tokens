/**
 * Indexer Types
 */

/**
 * DAS Asset
 */
export interface DASAsset {
  id: string
  interface: 'V1_NFT' | 'V1_PRINT' | 'LEGACY_NFT' | 'V2_NFT' | 'FungibleAsset' | 'FungibleToken' | 'Custom' | 'Identity' | 'Executable' | 'ProgrammableNFT'
  content: {
    $schema: string
    json_uri: string
    files?: Array<{ uri: string, mime: string }>
    metadata: {
      name: string
      symbol: string
      description?: string
      attributes?: Array<{ trait_type: string, value: string | number }>
    }
    links?: {
      image?: string
      external_url?: string
      animation_url?: string
    }
  }
  authorities: Array<{ address: string, scopes: string[] }>
  compression?: {
    eligible: boolean
    compressed: boolean
    data_hash: string
    creator_hash: string
    asset_hash: string
    tree: string
    seq: number
    leaf_id: number
  }
  grouping: Array<{ group_key: string, group_value: string }>
  royalty: {
    royalty_model: string
    target: string | null
    percent: number
    basis_points: number
    primary_sale_happened: boolean
    locked: boolean
  }
  creators: Array<{ address: string, share: number, verified: boolean }>
  ownership: {
    frozen: boolean
    delegated: boolean
    delegate: string | null
    ownership_model: string
    owner: string
  }
  supply?: {
    print_max_supply: number
    print_current_supply: number
    edition_nonce: number | null
  }
  mutable: boolean
  burnt: boolean
}

/**
 * DAS Search options
 */
export interface DASSearchOptions {
  ownerAddress?: string
  creatorAddress?: string
  creatorVerified?: boolean
  authorityAddress?: string
  grouping?: { group_key: string, group_value: string }[]
  delegate?: string
  frozen?: boolean
  supply?: { print_max_supply: number }
  supplyMint?: string
  compressed?: boolean
  compressible?: boolean
  royaltyTargetType?: string
  royaltyTarget?: string
  royaltyAmount?: number
  burnt?: boolean
  sortBy?: { sortBy: 'created' | 'updated' | 'recent_action', sortDirection: 'asc' | 'desc' }
  limit?: number
  page?: number
  before?: string
  after?: string
  jsonUri?: string
}

/**
 * DAS Search result
 */
export interface DASSearchResult {
  total: number
  limit: number
  page: number
  items: DASAsset[]
}

/**
 * Token balance
 */
export interface TokenBalance {
  mint: string
  owner: string
  amount: bigint
  decimals: number
  tokenAccount: string
}

/**
 * NFT collection
 */
export interface NFTCollection {
  address: string
  name: string
  symbol: string
  description?: string
  image?: string
  externalUrl?: string
  size: number
  floorPrice?: bigint
}

/**
 * Transaction history item
 */
export interface TransactionHistoryItem {
  signature: string
  type: string
  timestamp: number
  fee: number
  feePayer: string
  slot: number
  nativeTransfers?: Array<{
    fromUserAccount: string
    toUserAccount: string
    amount: number
  }>
  tokenTransfers?: Array<{
    fromUserAccount: string
    toUserAccount: string
    fromTokenAccount: string
    toTokenAccount: string
    tokenAmount: number
    mint: string
  }>
  accountData?: Array<{
    account: string
    nativeBalanceChange: number
    tokenBalanceChanges: Array<{
      mint: string
      rawTokenAmount: { tokenAmount: string, decimals: number }
      userAccount: string
    }>
  }>
  events?: {
    nft?: {
      description: string
      type: string
      source: string
      amount: number
      fee: number
      feePayer: string
      signature: string
      slot: number
      timestamp: number
      saleType: string
      buyer: string
      seller: string
      staker: string
      nfts: Array<{ mint: string, tokenStandard: string }>
    }
  }
}

/**
 * Webhook event types
 */
export type WebhookEventType
  = | 'NFT_SALE'
    | 'NFT_LISTING'
    | 'NFT_BID'
    | 'NFT_CANCEL_LISTING'
    | 'NFT_CANCEL_BID'
    | 'NFT_MINT'
    | 'TOKEN_TRANSFER'
    | 'ACCOUNT_CHANGE'

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  webhookURL: string
  transactionTypes: WebhookEventType[]
  accountAddresses?: string[]
  webhookType: 'enhanced' | 'raw'
}
