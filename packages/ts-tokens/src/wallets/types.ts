/**
 * Wallet Types
 */

import type { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

/**
 * Supported wallet types
 */
export type WalletType =
  | 'phantom'
  | 'solflare'
  | 'backpack'
  | 'ledger'
  | 'trezor'
  | 'coinbase'
  | 'trust'
  | 'exodus'
  | 'brave'
  | 'glow'

/**
 * Wallet adapter interface
 */
export interface WalletAdapter {
  name: string
  type: WalletType
  icon: string
  url: string
  connected: boolean
  publicKey: PublicKey | null

  connect(): Promise<void>
  disconnect(): Promise<void>
  signTransaction(transaction: Transaction): Promise<Transaction>
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>
  signMessage(message: Uint8Array): Promise<Uint8Array>
}

/**
 * Wallet connection state
 */
export interface WalletState {
  connected: boolean
  connecting: boolean
  disconnecting: boolean
  wallet: WalletAdapter | null
  publicKey: PublicKey | null
  error: Error | null
}

/**
 * Wallet connection options
 */
export interface ConnectOptions {
  onlyIfTrusted?: boolean
  timeout?: number
}

/**
 * Sign transaction options
 */
export interface SignOptions {
  skipPreflight?: boolean
}

/**
 * Wallet event types
 */
export type WalletEvent =
  | { type: 'connect'; publicKey: PublicKey }
  | { type: 'disconnect' }
  | { type: 'error'; error: Error }
  | { type: 'accountChange'; publicKey: PublicKey }

/**
 * Wallet event listener
 */
export type WalletEventListener = (_event: WalletEvent) => void

/**
 * Hardware wallet config
 */
export interface HardwareWalletConfig {
  derivationPath?: string
  accountIndex?: number
}

/**
 * Ledger-specific config
 */
export interface LedgerConfig extends HardwareWalletConfig {
  transport?: 'hid' | 'webusb' | 'webhid'
}

/**
 * Mobile wallet config
 */
export interface MobileWalletConfig {
  appIdentity: {
    name: string
    uri: string
    icon?: string
  }
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet'
}

/**
 * Wallet capabilities
 */
export interface WalletCapabilities {
  signTransaction: boolean
  signAllTransactions: boolean
  signMessage: boolean
  signAndSendTransaction: boolean
  versioned: boolean
}

/**
 * Wallet metadata
 */
export interface WalletMetadata {
  name: string
  type: WalletType
  icon: string
  url: string
  downloadUrl: string
  capabilities: WalletCapabilities
  mobile: boolean
  extension: boolean
  hardware: boolean
}
