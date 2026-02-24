/**
 * useWallet Hook
 *
 * Wraps @solana/wallet-adapter-react for wallet connectivity.
 */

import { useState, useEffect, useCallback } from 'react'
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
  const [adapter, setAdapter] = useState<any>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)

  useEffect(() => {
    let mounted = true

    import('@solana/wallet-adapter-react').then((mod) => {
      if (!mounted) return
      setAdapter(mod)
    }).catch(() => {
      // wallet-adapter-react not available
    })

    return () => { mounted = false }
  }, [])

  // Sync state from the adapter's useWallet hook when available
  // The adapter module provides its own useWallet, which we delegate to
  const walletContext = adapter?.useWallet?.() ?? null

  useEffect(() => {
    if (walletContext) {
      setConnected(walletContext.connected ?? false)
      setConnecting(walletContext.connecting ?? false)
      setPublicKey(walletContext.publicKey ?? null)
    }
  }, [walletContext?.connected, walletContext?.connecting, walletContext?.publicKey])

  const connect = useCallback(async () => {
    if (walletContext?.connect) {
      setConnecting(true)
      try {
        await walletContext.connect()
      } finally {
        setConnecting(false)
      }
    }
  }, [walletContext])

  const disconnect = useCallback(async () => {
    if (walletContext?.disconnect) {
      await walletContext.disconnect()
    }
  }, [walletContext])

  const signTransaction = walletContext?.signTransaction
    ? (transaction: Transaction) => walletContext.signTransaction!(transaction)
    : null

  const signMessage = walletContext?.signMessage
    ? (message: Uint8Array) => walletContext.signMessage!(message)
    : null

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
