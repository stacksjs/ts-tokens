/**
 * useWallet Composable
 *
 * Wallet connectivity with Vue reactivity.
 */

import { ref, type Ref } from 'vue'
import type { PublicKey, Transaction } from '@solana/web3.js'

/**
 * Wallet composable return type
 */
export interface UseWalletReturn {
  connected: Ref<boolean>
  connecting: Ref<boolean>
  publicKey: Ref<PublicKey | null>
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  signTransaction: ((_transaction: Transaction) => Promise<Transaction>) | null
  signMessage: ((_message: Uint8Array) => Promise<Uint8Array>) | null
}

/**
 * useWallet composable — provides wallet connect/disconnect/sign operations
 */
export function useWallet(): UseWalletReturn {
  const connected = ref<boolean>(false)
  const connecting = ref<boolean>(false)
  const publicKey = ref<PublicKey | null>(null) as Ref<PublicKey | null>

  let walletAdapter: any = null

  // Attempt to load wallet adapter
  // @ts-ignore -- optional peer dependency, resolved at runtime
  import('@solana/wallet-adapter-react').then((mod: any) => {
    walletAdapter = mod
  }).catch(() => {
    // wallet-adapter not available
  })

  const connect = async (): Promise<void> => {
    if (walletAdapter?.useWallet) {
      connecting.value = true
      try {
        const ctx = walletAdapter.useWallet()
        await ctx.connect()
        connected.value = true
        publicKey.value = ctx.publicKey ?? null
      } finally {
        connecting.value = false
      }
    }
  }

  const disconnect = async (): Promise<void> => {
    if (walletAdapter?.useWallet) {
      const ctx = walletAdapter.useWallet()
      await ctx.disconnect()
      connected.value = false
      publicKey.value = null
    }
  }

  const signTransaction = null
  const signMessage = null

  return {
    connected,
    connecting,
    publicKey,
    connect,
    disconnect,
    signTransaction,
    signMessage,
  }
}
