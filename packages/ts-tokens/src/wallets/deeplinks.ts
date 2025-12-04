/**
 * Wallet Deep Links
 *
 * Generate deep links for mobile wallet interactions.
 */

import { PublicKey, Transaction } from '@solana/web3.js'
import type { WalletType } from './types'
import bs58 from 'bs58'

/**
 * Deep link configuration
 */
export interface DeepLinkConfig {
  appUrl: string
  redirectUrl?: string
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet'
}

/**
 * Generate Phantom deep link for connect
 */
export function phantomConnectLink(config: DeepLinkConfig): string {
  const params = new URLSearchParams({
    app_url: config.appUrl,
    dapp_encryption_public_key: '', // Would be generated
    cluster: config.cluster ?? 'mainnet-beta',
  })

  if (config.redirectUrl) {
    params.set('redirect_link', config.redirectUrl)
  }

  return `phantom://v1/connect?${params.toString()}`
}

/**
 * Generate Phantom deep link for sign transaction
 */
export function phantomSignTransactionLink(
  transaction: Transaction,
  config: DeepLinkConfig
): string {
  const serialized = transaction.serialize({ requireAllSignatures: false })
  const encoded = bs58.encode(serialized)

  const params = new URLSearchParams({
    transaction: encoded,
    app_url: config.appUrl,
  })

  if (config.redirectUrl) {
    params.set('redirect_link', config.redirectUrl)
  }

  return `phantom://v1/signTransaction?${params.toString()}`
}

/**
 * Generate Phantom deep link for sign and send
 */
export function phantomSignAndSendLink(
  transaction: Transaction,
  config: DeepLinkConfig
): string {
  const serialized = transaction.serialize({ requireAllSignatures: false })
  const encoded = bs58.encode(serialized)

  const params = new URLSearchParams({
    transaction: encoded,
    app_url: config.appUrl,
  })

  if (config.redirectUrl) {
    params.set('redirect_link', config.redirectUrl)
  }

  return `phantom://v1/signAndSendTransaction?${params.toString()}`
}

/**
 * Generate Solflare deep link for connect
 */
export function solflareConnectLink(config: DeepLinkConfig): string {
  const params = new URLSearchParams({
    app_url: config.appUrl,
    cluster: config.cluster ?? 'mainnet-beta',
  })

  if (config.redirectUrl) {
    params.set('redirect_url', config.redirectUrl)
  }

  return `solflare://connect?${params.toString()}`
}

/**
 * Generate Solflare deep link for sign transaction
 */
export function solflareSignTransactionLink(
  transaction: Transaction,
  config: DeepLinkConfig
): string {
  const serialized = transaction.serialize({ requireAllSignatures: false })
  const encoded = bs58.encode(serialized)

  const params = new URLSearchParams({
    transaction: encoded,
    app_url: config.appUrl,
  })

  if (config.redirectUrl) {
    params.set('redirect_url', config.redirectUrl)
  }

  return `solflare://sign?${params.toString()}`
}

/**
 * Generate universal deep link (tries to detect wallet)
 */
export function generateDeepLink(
  wallet: WalletType,
  action: 'connect' | 'sign' | 'signAndSend',
  config: DeepLinkConfig,
  transaction?: Transaction
): string {
  switch (wallet) {
    case 'phantom':
      if (action === 'connect') {
        return phantomConnectLink(config)
      }
      if (action === 'sign' && transaction) {
        return phantomSignTransactionLink(transaction, config)
      }
      if (action === 'signAndSend' && transaction) {
        return phantomSignAndSendLink(transaction, config)
      }
      break

    case 'solflare':
      if (action === 'connect') {
        return solflareConnectLink(config)
      }
      if ((action === 'sign' || action === 'signAndSend') && transaction) {
        return solflareSignTransactionLink(transaction, config)
      }
      break
  }

  throw new Error(`Unsupported wallet or action: ${wallet}/${action}`)
}

/**
 * Check if running on mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Check if wallet app is installed (mobile)
 */
export function isWalletAppInstalled(wallet: WalletType): boolean {
  // Can't reliably detect on web, return false
  return false
}

/**
 * Get app store link for wallet
 */
export function getAppStoreLink(wallet: WalletType, platform: 'ios' | 'android'): string {
  const links: Record<WalletType, { ios: string; android: string }> = {
    phantom: {
      ios: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
      android: 'https://play.google.com/store/apps/details?id=app.phantom',
    },
    solflare: {
      ios: 'https://apps.apple.com/app/solflare/id1580902717',
      android: 'https://play.google.com/store/apps/details?id=com.solflare.mobile',
    },
    backpack: {
      ios: 'https://apps.apple.com/app/backpack-crypto-wallet/id1631907264',
      android: 'https://play.google.com/store/apps/details?id=app.backpack.mobile',
    },
    ledger: {
      ios: 'https://apps.apple.com/app/ledger-live/id1361671700',
      android: 'https://play.google.com/store/apps/details?id=com.ledger.live',
    },
    trezor: {
      ios: '',
      android: '',
    },
    coinbase: {
      ios: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
      android: 'https://play.google.com/store/apps/details?id=org.toshi',
    },
    trust: {
      ios: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
      android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    },
    exodus: {
      ios: 'https://apps.apple.com/app/exodus-crypto-bitcoin-wallet/id1414384820',
      android: 'https://play.google.com/store/apps/details?id=exodusmovement.exodus',
    },
    brave: {
      ios: 'https://apps.apple.com/app/brave-private-web-browser/id1052879175',
      android: 'https://play.google.com/store/apps/details?id=com.brave.browser',
    },
    glow: {
      ios: 'https://apps.apple.com/app/glow-solana-wallet/id1599584512',
      android: 'https://play.google.com/store/apps/details?id=com.luma.wallet.prod',
    },
  }

  return links[wallet]?.[platform] ?? ''
}

/**
 * Open wallet with fallback to app store
 */
export function openWallet(
  wallet: WalletType,
  deepLink: string,
  fallbackToStore: boolean = true
): void {
  if (typeof window === 'undefined') return

  // Try to open deep link
  window.location.href = deepLink

  // If still here after timeout, open app store
  if (fallbackToStore) {
    setTimeout(() => {
      const platform = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'android'
      const storeLink = getAppStoreLink(wallet, platform)
      if (storeLink) {
        window.location.href = storeLink
      }
    }, 2000)
  }
}
