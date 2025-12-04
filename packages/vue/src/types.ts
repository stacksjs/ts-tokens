/**
 * Vue Tokens Types
 */

import type { Connection } from '@solana/web3.js'
import type { TokenConfig } from 'ts-tokens'

/**
 * Plugin options
 */
export interface TokensPluginOptions {
  endpoint: string
  config?: Partial<TokenConfig>
}

/**
 * Token display info
 */
export interface TokenDisplayInfo {
  mint: string
  name: string
  symbol: string
  decimals: number
  balance: bigint
  uiBalance: number
  logoUri?: string
}

/**
 * NFT display info
 */
export interface NFTDisplayInfo {
  mint: string
  name: string
  symbol: string
  uri: string
  image?: string
  description?: string
  collection?: string
  attributes?: Array<{ trait_type: string; value: string }>
}

/**
 * Candy Machine display info
 */
export interface CandyMachineDisplayInfo {
  address: string
  itemsAvailable: number
  itemsMinted: number
  itemsRemaining: number
  price: bigint
  goLiveDate: Date | null
  isActive: boolean
  isSoldOut: boolean
}

/**
 * Transaction state
 */
export interface TransactionState {
  pending: boolean
  signature: string | null
  error: Error | null
  confirmed: boolean
}
