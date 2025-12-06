/**
 * Wallet Types
 *
 * Type definitions for wallet management and signing.
 */

/**
 * Keypair interface (compatible with Solana web3.js)
 */
export interface Keypair {
  /**
   * Public key as base58 string
   */
  publicKey: string

  /**
   * Secret key as Uint8Array
   */
  secretKey: Uint8Array
}

/**
 * Wallet interface for signing transactions
 */
export interface Wallet {
  /**
   * Wallet public key
   */
  publicKey: string

  /**
   * Sign a single transaction
   */
  signTransaction: <T>(transaction: T) => Promise<T>

  /**
   * Sign multiple transactions
   */
  signAllTransactions: <T>(transactions: T[]) => Promise<T[]>

  /**
   * Sign a message
   */
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>
}

/**
 * Wallet adapter for browser wallets
 */
export interface WalletAdapter extends Wallet {
  /**
   * Wallet name
   */
  name: string

  /**
   * Wallet icon URL
   */
  icon: string

  /**
   * Whether wallet is connected
   */
  connected: boolean

  /**
   * Whether wallet is connecting
   */
  connecting: boolean

  /**
   * Connect to wallet
   */
  connect: () => Promise<void>

  /**
   * Disconnect from wallet
   */
  disconnect: () => Promise<void>

  /**
   * Event listeners
   */
  on: (event: 'connect' | 'disconnect' | 'error', callback: (arg?: unknown) => void) => void
  off: (event: 'connect' | 'disconnect' | 'error', callback: (arg?: unknown) => void) => void
}

/**
 * Wallet connection status
 */
export type WalletStatus
  = | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'disconnecting'
    | 'error'

/**
 * Wallet info for display
 */
export interface WalletInfo {
  /**
   * Wallet name
   */
  name: string

  /**
   * Wallet icon URL
   */
  icon: string

  /**
   * Whether wallet is installed/available
   */
  installed: boolean

  /**
   * Wallet URL for installation
   */
  url: string

  /**
   * Supported features
   */
  features: WalletFeature[]
}

/**
 * Wallet features
 */
export type WalletFeature
  = | 'standard:connect'
    | 'standard:disconnect'
    | 'standard:events'
    | 'solana:signTransaction'
    | 'solana:signAllTransactions'
    | 'solana:signMessage'
    | 'solana:signAndSendTransaction'

/**
 * Hardware wallet types
 */
export type HardwareWalletType = 'ledger' | 'trezor'

/**
 * Hardware wallet configuration
 */
export interface HardwareWalletConfig {
  /**
   * Wallet type
   */
  type: HardwareWalletType

  /**
   * Derivation path
   * @default "44'/501'/0'/0'"
   */
  derivationPath?: string

  /**
   * Account index
   * @default 0
   */
  accountIndex?: number
}

/**
 * Signing options
 */
export interface SigningOptions {
  /**
   * Skip confirmation prompt (for hardware wallets)
   * @default false
   */
  skipConfirmation?: boolean

  /**
   * Display message on hardware wallet
   */
  displayMessage?: string
}

/**
 * Multi-signature wallet configuration
 */
export interface MultiSigConfig {
  /**
   * Required number of signatures (M)
   */
  threshold: number

  /**
   * List of owner public keys (N)
   */
  owners: string[]

  /**
   * Multi-sig account address
   */
  address?: string
}

/**
 * Multi-signature transaction
 */
export interface MultiSigTransaction {
  /**
   * Transaction account address
   */
  address: string

  /**
   * Multi-sig account address
   */
  multisig: string

  /**
   * Program ID being called
   */
  programId: string

  /**
   * Transaction data
   */
  data: Uint8Array

  /**
   * Signers who have approved
   */
  signers: boolean[]

  /**
   * Whether transaction has been executed
   */
  executed: boolean

  /**
   * Creation timestamp
   */
  createdAt: number

  /**
   * Expiration timestamp (if any)
   */
  expiresAt?: number
}

/**
 * Wallet balance information
 */
export interface WalletBalance {
  /**
   * Native token balance (SOL in lamports)
   */
  native: bigint

  /**
   * Native token balance in human-readable format
   */
  nativeFormatted: string

  /**
   * Token balances
   */
  tokens: Array<{
    mint: string
    balance: bigint
    decimals: number
    formatted: string
    name?: string
    symbol?: string
    logo?: string
  }>

  /**
   * NFT count
   */
  nftCount: number
}

/**
 * Wallet activity/transaction history
 */
export interface WalletActivity {
  /**
   * Transaction signature
   */
  signature: string

  /**
   * Activity type
   */
  type: 'send' | 'receive' | 'swap' | 'mint' | 'burn' | 'stake' | 'unstake' | 'other'

  /**
   * Timestamp
   */
  timestamp: number

  /**
   * Status
   */
  status: 'success' | 'failed'

  /**
   * Amount (if applicable)
   */
  amount?: bigint

  /**
   * Token mint (if applicable)
   */
  mint?: string

  /**
   * Counterparty address
   */
  counterparty?: string

  /**
   * Transaction fee
   */
  fee: number

  /**
   * Description
   */
  description?: string
}
