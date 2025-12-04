/**
 * Wallet Adapters
 */

import { PublicKey, Transaction } from '@solana/web3.js'
import type {
  WalletAdapter,
  WalletType,
  WalletMetadata,
  WalletCapabilities,
  ConnectOptions,
} from './types'

/**
 * Wallet registry with metadata
 */
export const WALLET_REGISTRY: Record<WalletType, WalletMetadata> = {
  phantom: {
    name: 'Phantom',
    type: 'phantom',
    icon: 'https://phantom.app/img/logo.png',
    url: 'https://phantom.app',
    downloadUrl: 'https://phantom.app/download',
    capabilities: {
      signTransaction: true,
      signAllTransactions: true,
      signMessage: true,
      signAndSendTransaction: true,
      versioned: true,
    },
    mobile: true,
    extension: true,
    hardware: false,
  },
  solflare: {
    name: 'Solflare',
    type: 'solflare',
    icon: 'https://solflare.com/favicon.ico',
    url: 'https://solflare.com',
    downloadUrl: 'https://solflare.com/download',
    capabilities: {
      signTransaction: true,
      signAllTransactions: true,
      signMessage: true,
      signAndSendTransaction: true,
      versioned: true,
    },
    mobile: true,
    extension: true,
    hardware: false,
  },
  backpack: {
    name: 'Backpack',
    type: 'backpack',
    icon: 'https://backpack.app/favicon.ico',
    url: 'https://backpack.app',
    downloadUrl: 'https://backpack.app/download',
    capabilities: {
      signTransaction: true,
      signAllTransactions: true,
      signMessage: true,
      signAndSendTransaction: true,
      versioned: true,
    },
    mobile: true,
    extension: true,
    hardware: false,
  },
  ledger: {
    name: 'Ledger',
    type: 'ledger',
    icon: 'https://www.ledger.com/favicon.ico',
    url: 'https://www.ledger.com',
    downloadUrl: 'https://www.ledger.com/start',
    capabilities: {
      signTransaction: true,
      signAllTransactions: true,
      signMessage: true,
      signAndSendTransaction: false,
      versioned: true,
    },
    mobile: false,
    extension: false,
    hardware: true,
  },
  trezor: {
    name: 'Trezor',
    type: 'trezor',
    icon: 'https://trezor.io/favicon.ico',
    url: 'https://trezor.io',
    downloadUrl: 'https://trezor.io/start',
    capabilities: {
      signTransaction: true,
      signAllTransactions: false,
      signMessage: true,
      signAndSendTransaction: false,
      versioned: false,
    },
    mobile: false,
    extension: false,
    hardware: true,
  },
  coinbase: {
    name: 'Coinbase Wallet',
    type: 'coinbase',
    icon: 'https://www.coinbase.com/favicon.ico',
    url: 'https://www.coinbase.com/wallet',
    downloadUrl: 'https://www.coinbase.com/wallet/downloads',
    capabilities: {
      signTransaction: true,
      signAllTransactions: true,
      signMessage: true,
      signAndSendTransaction: true,
      versioned: true,
    },
    mobile: true,
    extension: true,
    hardware: false,
  },
  trust: {
    name: 'Trust Wallet',
    type: 'trust',
    icon: 'https://trustwallet.com/favicon.ico',
    url: 'https://trustwallet.com',
    downloadUrl: 'https://trustwallet.com/download',
    capabilities: {
      signTransaction: true,
      signAllTransactions: true,
      signMessage: true,
      signAndSendTransaction: true,
      versioned: true,
    },
    mobile: true,
    extension: true,
    hardware: false,
  },
  exodus: {
    name: 'Exodus',
    type: 'exodus',
    icon: 'https://www.exodus.com/favicon.ico',
    url: 'https://www.exodus.com',
    downloadUrl: 'https://www.exodus.com/download',
    capabilities: {
      signTransaction: true,
      signAllTransactions: true,
      signMessage: true,
      signAndSendTransaction: true,
      versioned: true,
    },
    mobile: true,
    extension: true,
    hardware: false,
  },
  brave: {
    name: 'Brave Wallet',
    type: 'brave',
    icon: 'https://brave.com/favicon.ico',
    url: 'https://brave.com/wallet',
    downloadUrl: 'https://brave.com/download',
    capabilities: {
      signTransaction: true,
      signAllTransactions: true,
      signMessage: true,
      signAndSendTransaction: true,
      versioned: true,
    },
    mobile: true,
    extension: true,
    hardware: false,
  },
  glow: {
    name: 'Glow',
    type: 'glow',
    icon: 'https://glow.app/favicon.ico',
    url: 'https://glow.app',
    downloadUrl: 'https://glow.app/download',
    capabilities: {
      signTransaction: true,
      signAllTransactions: true,
      signMessage: true,
      signAndSendTransaction: true,
      versioned: true,
    },
    mobile: true,
    extension: true,
    hardware: false,
  },
}

/**
 * Get available wallets in browser
 */
export function getAvailableWallets(): WalletType[] {
  const available: WalletType[] = []

  if (typeof window === 'undefined') {
    return available
  }

  const win = window as unknown as Record<string, unknown>

  if (win.phantom?.solana) available.push('phantom')
  if (win.solflare) available.push('solflare')
  if (win.backpack) available.push('backpack')
  if (win.coinbaseSolana) available.push('coinbase')
  if (win.trustWallet?.solana) available.push('trust')
  if (win.exodus?.solana) available.push('exodus')
  if (win.braveSolana) available.push('brave')
  if (win.glowSolana) available.push('glow')

  return available
}

/**
 * Get wallet metadata
 */
export function getWalletMetadata(type: WalletType): WalletMetadata {
  return WALLET_REGISTRY[type]
}

/**
 * Check if wallet is installed
 */
export function isWalletInstalled(type: WalletType): boolean {
  return getAvailableWallets().includes(type)
}

/**
 * Get recommended wallet for platform
 */
export function getRecommendedWallet(): WalletType {
  const available = getAvailableWallets()

  // Prefer in order
  const preferred: WalletType[] = ['phantom', 'solflare', 'backpack']

  for (const wallet of preferred) {
    if (available.includes(wallet)) {
      return wallet
    }
  }

  return 'phantom' // Default recommendation
}

/**
 * Create a basic wallet adapter (for browser wallets)
 */
export function createWalletAdapter(type: WalletType): WalletAdapter | null {
  if (typeof window === 'undefined') {
    return null
  }

  const metadata = WALLET_REGISTRY[type]
  const win = window as unknown as Record<string, unknown>

  let provider: unknown

  switch (type) {
    case 'phantom':
      provider = (win.phantom as Record<string, unknown>)?.solana
      break
    case 'solflare':
      provider = win.solflare
      break
    case 'backpack':
      provider = win.backpack
      break
    default:
      return null
  }

  if (!provider) {
    return null
  }

  const p = provider as {
    publicKey?: { toBase58(): string }
    isConnected?: boolean
    connect(opts?: ConnectOptions): Promise<{ publicKey: { toBase58(): string } }>
    disconnect(): Promise<void>
    signTransaction(tx: Transaction): Promise<Transaction>
    signAllTransactions(txs: Transaction[]): Promise<Transaction[]>
    signMessage(msg: Uint8Array): Promise<{ signature: Uint8Array }>
  }

  return {
    name: metadata.name,
    type,
    icon: metadata.icon,
    url: metadata.url,
    connected: p.isConnected ?? false,
    publicKey: p.publicKey ? new PublicKey(p.publicKey.toBase58()) : null,

    async connect() {
      const result = await p.connect()
      this.publicKey = new PublicKey(result.publicKey.toBase58())
      this.connected = true
    },

    async disconnect() {
      await p.disconnect()
      this.publicKey = null
      this.connected = false
    },

    async signTransaction(transaction: Transaction) {
      return p.signTransaction(transaction)
    },

    async signAllTransactions(transactions: Transaction[]) {
      return p.signAllTransactions(transactions)
    },

    async signMessage(message: Uint8Array) {
      const result = await p.signMessage(message)
      return result.signature
    },
  }
}
