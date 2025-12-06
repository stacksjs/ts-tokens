/**
 * React Tokens Types
 */

import type { Connection, PublicKey } from '@solana/web3.js'

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
  attributes?: Array<{ trait_type: string, value: string }>
}

/**
 * Wallet state
 */
export interface WalletState {
  connected: boolean
  connecting: boolean
  disconnecting: boolean
  publicKey: PublicKey | null
  address: string | null
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
 * Component common props
 */
export interface CommonProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Token component props
 */
export interface TokenProps extends CommonProps {
  mint: string
  connection?: Connection
}

/**
 * NFT component props
 */
export interface NFTProps extends CommonProps {
  mint: string
  connection?: Connection
  showDetails?: boolean
}

/**
 * Wallet component props
 */
export interface WalletProps extends CommonProps {
  onConnect?: () => void
  onDisconnect?: () => void
}

/**
 * Candy Machine component props
 */
export interface CandyMachineProps extends CommonProps {
  candyMachine: string
  connection?: Connection
}

/**
 * Transaction toast props
 */
export interface TransactionToastProps extends CommonProps {
  signature: string
  status: 'pending' | 'confirmed' | 'error'
  message?: string
  explorerUrl?: string
}
