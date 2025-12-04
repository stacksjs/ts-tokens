/**
 * Event Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Event types
 */
export type EventType =
  | 'token_transfer'
  | 'token_mint'
  | 'token_burn'
  | 'nft_transfer'
  | 'nft_mint'
  | 'nft_burn'
  | 'nft_sale'
  | 'nft_listing'
  | 'nft_offer'
  | 'nft_cancel_listing'
  | 'stake'
  | 'unstake'
  | 'claim_rewards'
  | 'proposal_created'
  | 'vote_cast'
  | 'proposal_executed'
  | 'account_change'

/**
 * Base event
 */
export interface BaseEvent {
  type: EventType
  signature: string
  slot: number
  timestamp: number
  blockTime: number
}

/**
 * Token transfer event
 */
export interface TokenTransferEvent extends BaseEvent {
  type: 'token_transfer'
  mint: PublicKey
  from: PublicKey
  to: PublicKey
  amount: bigint
  decimals: number
}

/**
 * Token mint event
 */
export interface TokenMintEvent extends BaseEvent {
  type: 'token_mint'
  mint: PublicKey
  to: PublicKey
  amount: bigint
  authority: PublicKey
}

/**
 * Token burn event
 */
export interface TokenBurnEvent extends BaseEvent {
  type: 'token_burn'
  mint: PublicKey
  from: PublicKey
  amount: bigint
}

/**
 * NFT transfer event
 */
export interface NFTTransferEvent extends BaseEvent {
  type: 'nft_transfer'
  mint: PublicKey
  from: PublicKey
  to: PublicKey
  collection?: PublicKey
}

/**
 * NFT mint event
 */
export interface NFTMintEvent extends BaseEvent {
  type: 'nft_mint'
  mint: PublicKey
  owner: PublicKey
  collection?: PublicKey
  name: string
}

/**
 * NFT sale event
 */
export interface NFTSaleEvent extends BaseEvent {
  type: 'nft_sale'
  mint: PublicKey
  seller: PublicKey
  buyer: PublicKey
  price: bigint
  marketplace: string
  royaltyPaid?: bigint
}

/**
 * NFT listing event
 */
export interface NFTListingEvent extends BaseEvent {
  type: 'nft_listing'
  mint: PublicKey
  seller: PublicKey
  price: bigint
  marketplace: string
  expiry?: number
}

/**
 * Stake event
 */
export interface StakeEvent extends BaseEvent {
  type: 'stake'
  pool: PublicKey
  user: PublicKey
  amount: bigint
  mint: PublicKey
}

/**
 * Unstake event
 */
export interface UnstakeEvent extends BaseEvent {
  type: 'unstake'
  pool: PublicKey
  user: PublicKey
  amount: bigint
  mint: PublicKey
  rewards?: bigint
}

/**
 * Union of all events
 */
export type TokenEvent =
  | TokenTransferEvent
  | TokenMintEvent
  | TokenBurnEvent
  | NFTTransferEvent
  | NFTMintEvent
  | NFTSaleEvent
  | NFTListingEvent
  | StakeEvent
  | UnstakeEvent

/**
 * Event filter
 */
export interface EventFilter {
  types?: EventType[]
  mints?: PublicKey[]
  accounts?: PublicKey[]
  collections?: PublicKey[]
  minAmount?: bigint
  startSlot?: number
  endSlot?: number
}

/**
 * Event listener callback
 */
export type EventCallback = (event: TokenEvent) => void | Promise<void>

/**
 * Listener options
 */
export interface ListenerOptions {
  filter?: EventFilter
  commitment?: 'processed' | 'confirmed' | 'finalized'
  batchSize?: number
}

/**
 * Webhook config
 */
export interface WebhookConfig {
  url: string
  events: EventType[]
  secret?: string
  retries?: number
  timeout?: number
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
  id: string
  timestamp: number
  event: TokenEvent
  signature: string
}
