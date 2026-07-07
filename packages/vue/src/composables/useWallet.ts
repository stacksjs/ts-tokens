/**
 * useWallet Composable
 *
 * Wallet connectivity with Vue reactivity.
 *
 * Integrates with an injected Phantom-style wallet provider exposed on
 * `window.solana` (the de-facto standard implemented by Phantom, Solflare,
 * Backpack and other Solana browser wallets). This deliberately avoids
 * `@solana/wallet-adapter-react`, which is a React-only package and cannot
 * drive Vue reactivity.
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { PublicKey, type Transaction } from '@solana/web3.js'

/**
 * Minimal shape of a Phantom-style injected Solana wallet provider.
 */
interface InjectedSolanaProvider {
  publicKey?: { toBytes: () => Uint8Array, toString: () => string } | null
  isConnected?: boolean
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>
  disconnect: () => Promise<void>
  signTransaction?: (transaction: Transaction) => Promise<Transaction>
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array } | Uint8Array>
  on?: (event: string, handler: (...args: any[]) => void) => void
  off?: (event: string, handler: (...args: any[]) => void) => void
  removeListener?: (event: string, handler: (...args: any[]) => void) => void
}

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

function getProvider(): InjectedSolanaProvider | null {
  if (typeof window === 'undefined') return null
  const provider = (window as any).solana as InjectedSolanaProvider | undefined
  return provider ?? null
}

function toPublicKey(key: { toString: () => string } | null | undefined): PublicKey | null {
  if (!key) return null
  try {
    return new PublicKey(key.toString())
  } catch {
    return null
  }
}

/**
 * useWallet composable — provides wallet connect/disconnect/sign operations
 * backed by an injected `window.solana` provider.
 */
export function useWallet(): UseWalletReturn {
  const connected = ref<boolean>(false)
  const connecting = ref<boolean>(false)
  const publicKey = ref<PublicKey | null>(null) as Ref<PublicKey | null>

  const provider = getProvider()

  const handleConnect = (key?: { toString: () => string }): void => {
    publicKey.value = toPublicKey(key ?? provider?.publicKey ?? null)
    connected.value = publicKey.value !== null
  }

  const handleDisconnect = (): void => {
    connected.value = false
    publicKey.value = null
  }

  // Reflect any pre-existing connection and subscribe to provider events so
  // the refs stay genuinely reactive to external connect/disconnect actions.
  onMounted(() => {
    const p = getProvider()
    if (!p) return
    if (p.isConnected && p.publicKey) {
      handleConnect(p.publicKey)
    }
    p.on?.('connect', handleConnect)
    p.on?.('disconnect', handleDisconnect)
  })

  onUnmounted(() => {
    const p = getProvider()
    if (!p) return
    const remove = p.off ?? p.removeListener
    remove?.call(p, 'connect', handleConnect)
    remove?.call(p, 'disconnect', handleDisconnect)
  })

  const connect = async (): Promise<void> => {
    const p = getProvider()
    if (!p) {
      throw new Error('No Solana wallet found. Install a wallet extension (e.g. Phantom).')
    }
    connecting.value = true
    try {
      const res = await p.connect()
      handleConnect(res?.publicKey ?? p.publicKey ?? undefined)
    } finally {
      connecting.value = false
    }
  }

  const disconnect = async (): Promise<void> => {
    const p = getProvider()
    if (!p) return
    await p.disconnect()
    handleDisconnect()
  }

  const signTransaction = provider?.signTransaction
    ? (transaction: Transaction): Promise<Transaction> => {
        const p = getProvider()
        if (!p?.signTransaction) {
          throw new Error('Connected wallet does not support signTransaction')
        }
        return p.signTransaction(transaction)
      }
    : null

  const signMessage = provider?.signMessage
    ? async (message: Uint8Array): Promise<Uint8Array> => {
        const p = getProvider()
        if (!p?.signMessage) {
          throw new Error('Connected wallet does not support signMessage')
        }
        const result = await p.signMessage(message)
        // Phantom returns { signature }, some wallets return the raw bytes.
        return (result as { signature?: Uint8Array }).signature ?? (result as Uint8Array)
      }
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
