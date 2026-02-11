/**
 * Browser Wallet Adapters
 *
 * Class-based adapters for browser extension wallets (Phantom, Solflare, etc.).
 */

import { PublicKey, Transaction } from '@solana/web3.js'
import type { WalletAdapter, WalletType, ConnectOptions } from './types'

/**
 * Standard Solana wallet provider interface exposed by browser extensions
 */
interface SolanaProvider {
  publicKey?: { toBase58(): string }
  isConnected?: boolean
  connect(opts?: ConnectOptions): Promise<{ publicKey: { toBase58(): string } }>
  disconnect(): Promise<void>
  signTransaction(transaction: Transaction): Promise<Transaction>
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>
}

/**
 * Phantom wallet adapter
 */
export class PhantomWalletAdapter implements WalletAdapter {
  readonly name = 'Phantom'
  readonly type: WalletType = 'phantom'
  readonly icon = 'https://phantom.app/img/logo.png'
  readonly url = 'https://phantom.app'

  connected = false
  publicKey: PublicKey | null = null

  private provider: SolanaProvider | null = null

  private getProvider(): SolanaProvider {
    if (this.provider) return this.provider

    if (typeof window === 'undefined') {
      throw new Error('Phantom is only available in browser environments')
    }

    const win = window as unknown as Record<string, unknown>
    const phantom = win.phantom as Record<string, unknown> | undefined
    const provider = phantom?.solana as SolanaProvider | undefined

    if (!provider) {
      throw new Error('Phantom wallet not installed. Visit https://phantom.app/download')
    }

    this.provider = provider
    return provider
  }

  async connect(): Promise<void> {
    const provider = this.getProvider()
    const result = await provider.connect()
    this.publicKey = new PublicKey(result.publicKey.toBase58())
    this.connected = true
  }

  async disconnect(): Promise<void> {
    const provider = this.getProvider()
    await provider.disconnect()
    this.publicKey = null
    this.connected = false
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    const provider = this.getProvider()
    return provider.signTransaction(transaction)
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const provider = this.getProvider()
    return provider.signAllTransactions(transactions)
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const provider = this.getProvider()
    const result = await provider.signMessage(message)
    return result.signature
  }
}

/**
 * Solflare wallet adapter
 */
export class SolflareWalletAdapter implements WalletAdapter {
  readonly name = 'Solflare'
  readonly type: WalletType = 'solflare'
  readonly icon = 'https://solflare.com/favicon.ico'
  readonly url = 'https://solflare.com'

  connected = false
  publicKey: PublicKey | null = null

  private provider: SolanaProvider | null = null

  private getProvider(): SolanaProvider {
    if (this.provider) return this.provider

    if (typeof window === 'undefined') {
      throw new Error('Solflare is only available in browser environments')
    }

    const win = window as unknown as Record<string, unknown>
    const provider = win.solflare as SolanaProvider | undefined

    if (!provider) {
      throw new Error('Solflare wallet not installed. Visit https://solflare.com/download')
    }

    this.provider = provider
    return provider
  }

  async connect(): Promise<void> {
    const provider = this.getProvider()
    const result = await provider.connect()
    this.publicKey = new PublicKey(result.publicKey.toBase58())
    this.connected = true
  }

  async disconnect(): Promise<void> {
    const provider = this.getProvider()
    await provider.disconnect()
    this.publicKey = null
    this.connected = false
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    const provider = this.getProvider()
    return provider.signTransaction(transaction)
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const provider = this.getProvider()
    return provider.signAllTransactions(transactions)
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const provider = this.getProvider()
    const result = await provider.signMessage(message)
    return result.signature
  }
}

/**
 * Generic browser wallet adapter configuration
 */
export interface GenericBrowserWalletConfig {
  name: string
  type: WalletType
  icon: string
  url: string
  getProvider: () => SolanaProvider | undefined
}

/**
 * Generic browser wallet adapter for any standard Solana wallet provider
 */
export class GenericBrowserWalletAdapter implements WalletAdapter {
  readonly name: string
  readonly type: WalletType
  readonly icon: string
  readonly url: string

  connected = false
  publicKey: PublicKey | null = null

  private provider: SolanaProvider | null = null
  private providerGetter: () => SolanaProvider | undefined

  constructor(config: GenericBrowserWalletConfig) {
    this.name = config.name
    this.type = config.type
    this.icon = config.icon
    this.url = config.url
    this.providerGetter = config.getProvider
  }

  private getProvider(): SolanaProvider {
    if (this.provider) return this.provider

    if (typeof window === 'undefined') {
      throw new Error(`${this.name} is only available in browser environments`)
    }

    const provider = this.providerGetter()

    if (!provider) {
      throw new Error(`${this.name} wallet not installed. Visit ${this.url}`)
    }

    this.provider = provider
    return provider
  }

  async connect(): Promise<void> {
    const provider = this.getProvider()
    const result = await provider.connect()
    this.publicKey = new PublicKey(result.publicKey.toBase58())
    this.connected = true
  }

  async disconnect(): Promise<void> {
    const provider = this.getProvider()
    await provider.disconnect()
    this.publicKey = null
    this.connected = false
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    const provider = this.getProvider()
    return provider.signTransaction(transaction)
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const provider = this.getProvider()
    return provider.signAllTransactions(transactions)
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const provider = this.getProvider()
    const result = await provider.signMessage(message)
    return result.signature
  }
}

/**
 * Known browser wallet configs: metadata + provider getter
 */
const BROWSER_WALLETS: Partial<Record<WalletType, {
  name: string
  icon: string
  url: string
  getProvider: () => SolanaProvider | undefined
}>> = {
  backpack: {
    name: 'Backpack',
    icon: 'https://backpack.app/favicon.ico',
    url: 'https://backpack.app',
    getProvider: () => {
      const win = window as unknown as Record<string, unknown>
      return win.backpack as SolanaProvider | undefined
    },
  },
  coinbase: {
    name: 'Coinbase Wallet',
    icon: 'https://www.coinbase.com/favicon.ico',
    url: 'https://www.coinbase.com/wallet',
    getProvider: () => {
      const win = window as unknown as Record<string, unknown>
      return win.coinbaseSolana as SolanaProvider | undefined
    },
  },
  trust: {
    name: 'Trust Wallet',
    icon: 'https://trustwallet.com/favicon.ico',
    url: 'https://trustwallet.com',
    getProvider: () => {
      const win = window as unknown as Record<string, unknown>
      const trust = win.trustWallet as Record<string, unknown> | undefined
      return trust?.solana as SolanaProvider | undefined
    },
  },
  exodus: {
    name: 'Exodus',
    icon: 'https://www.exodus.com/favicon.ico',
    url: 'https://www.exodus.com',
    getProvider: () => {
      const win = window as unknown as Record<string, unknown>
      const exodus = win.exodus as Record<string, unknown> | undefined
      return exodus?.solana as SolanaProvider | undefined
    },
  },
  brave: {
    name: 'Brave Wallet',
    icon: 'https://brave.com/favicon.ico',
    url: 'https://brave.com/wallet',
    getProvider: () => {
      const win = window as unknown as Record<string, unknown>
      return win.braveSolana as SolanaProvider | undefined
    },
  },
  glow: {
    name: 'Glow',
    icon: 'https://glow.app/favicon.ico',
    url: 'https://glow.app',
    getProvider: () => {
      const win = window as unknown as Record<string, unknown>
      return win.glowSolana as SolanaProvider | undefined
    },
  },
}

/** Hardware wallet types that cannot use browser adapters */
const HARDWARE_WALLETS: WalletType[] = ['ledger', 'trezor']

/**
 * Factory: create a browser wallet adapter for the given wallet type.
 * Returns null for hardware wallets (use createLedgerAdapter instead).
 */
export function createBrowserWalletAdapter(type: WalletType): WalletAdapter | null {
  if (HARDWARE_WALLETS.includes(type)) {
    return null
  }

  if (typeof window === 'undefined') {
    return null
  }

  if (type === 'phantom') return new PhantomWalletAdapter()
  if (type === 'solflare') return new SolflareWalletAdapter()

  const walletConfig = BROWSER_WALLETS[type]
  if (!walletConfig) return null

  return new GenericBrowserWalletAdapter({
    name: walletConfig.name,
    type,
    icon: walletConfig.icon,
    url: walletConfig.url,
    getProvider: walletConfig.getProvider,
  })
}
