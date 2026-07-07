/**
 * useWallet Hook
 *
 * Wraps @solana/wallet-adapter-react for wallet connectivity.
 */

import { useCallback } from 'react'
// @solana/wallet-adapter-react is a peerDependency and is marked external at
// build time. Import its hook statically so React sees a stable, unconditional
// hook call on every render (a conditional/dynamic-import hook triggers
// "Rendered more hooks than during the previous render" when it becomes
// available mid-lifecycle).
import { useWallet as useAdapterWallet } from '@solana/wallet-adapter-react'
import type { PublicKey, Transaction } from '@solana/web3.js'

/**
 * Wallet hook return type
 */
export interface UseWalletReturn {
  connected: boolean
  connecting: boolean
  publicKey: PublicKey | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  signTransaction: ((_transaction: Transaction) => Promise<Transaction>) | null
  signMessage: ((_message: Uint8Array) => Promise<Uint8Array>) | null
}

/**
 * useWallet hook — wraps wallet adapter for connect/disconnect/sign operations
 */
export function useWallet(): UseWalletReturn {
  // Always call the adapter hook unconditionally.
  const walletContext = useAdapterWallet()

  const connect = useCallback(async () => {
    if (walletContext?.connect) {
      await walletContext.connect()
    }
  }, [walletContext])

  const disconnect = useCallback(async () => {
    if (walletContext?.disconnect) {
      await walletContext.disconnect()
    }
  }, [walletContext])

  const signTransaction = walletContext?.signTransaction
    ? (transaction: Transaction) =>
        (walletContext.signTransaction as (t: Transaction) => Promise<Transaction>)(transaction)
    : null

  const signMessage = walletContext?.signMessage
    ? (message: Uint8Array) => walletContext.signMessage!(message)
    : null

  return {
    connected: walletContext?.connected ?? false,
    connecting: walletContext?.connecting ?? false,
    publicKey: (walletContext?.publicKey as PublicKey | null) ?? null,
    connect,
    disconnect,
    signTransaction,
    signMessage,
  }
}
