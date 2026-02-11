/**
 * Playwright Wallet Mock
 *
 * Injects a fake Phantom-compatible Solana wallet provider into the page
 * so E2E tests can exercise wallet-connect and signing flows without a
 * real browser extension.
 */

import type { Page } from '@playwright/test'

/** A deterministic fake public-key (base58-encoded, 44 chars) */
export const MOCK_PUBLIC_KEY = '11111111111111111111111111111111'

/**
 * Inject a mock `window.phantom.solana` provider before the page loads.
 * Must be called *before* `page.goto()`.
 */
export async function injectWalletMock(page: Page, publicKey = MOCK_PUBLIC_KEY): Promise<void> {
  await page.addInitScript((pubKey) => {
    let _connected = false

    const provider = {
      isPhantom: true,
      isConnected: false,

      publicKey: {
        toBase58() {
          return pubKey
        },
        toString() {
          return pubKey
        },
      },

      async connect() {
        _connected = true
        provider.isConnected = true
        return { publicKey: provider.publicKey }
      },

      async disconnect() {
        _connected = false
        provider.isConnected = false
      },

      async signTransaction(tx: unknown) {
        if (!_connected) throw new Error('Wallet not connected')
        return tx
      },

      async signAllTransactions(txs: unknown[]) {
        if (!_connected) throw new Error('Wallet not connected')
        return txs
      },

      async signMessage(_message: Uint8Array) {
        if (!_connected) throw new Error('Wallet not connected')
        return { signature: new Uint8Array(64) }
      },
    }

    // Phantom exposes provider at window.phantom.solana AND window.solana
    ;(window as any).phantom = { solana: provider }
    ;(window as any).solana = provider
  }, publicKey)
}
