/**
 * useCandyMachine Composable
 *
 * Fetch Candy Machine state and info.
 */

import { ref, watch, onMounted, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import { useConnection } from './useConnection'
import type { CandyMachineDisplayInfo } from '../types'

/**
 * Candy Machine return type
 */
export interface UseCandyMachineReturn {
  candyMachine: Ref<CandyMachineDisplayInfo | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

/**
 * useCandyMachine composable
 */
export function useCandyMachine(address: MaybeRefOrGetter<string>): UseCandyMachineReturn {
  const connection = useConnection()
  const candyMachine = ref<CandyMachineDisplayInfo | null>(null)
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  // Cancellation guard so a slow older response can't overwrite newer state.
  let requestId = 0

  const fetchCandyMachine = async (): Promise<void> => {
    const currentRequest = ++requestId
    const addr = toValue(address)

    try {
      loading.value = true
      error.value = null

      const { PublicKey } = await import('@solana/web3.js')
      const { candyMachine: cm } = await import('ts-tokens/programs')
      const cmPubkey = new PublicKey(addr)
      const accountInfo = await connection.getAccountInfo(cmPubkey)

      if (currentRequest !== requestId) return

      if (!accountInfo) {
        throw new Error('Candy Machine not found')
      }

      // Deserialize the real Candy Machine account.
      const decoded = cm.deserializeCandyMachine(Buffer.from(accountInfo.data))

      const itemsAvailable = Number(decoded.data.itemsAvailable)
      const itemsMinted = Number(decoded.itemsRedeemed)

      // NOTE: price and goLiveDate are not stored on the Candy Machine account
      // itself — they live in the associated Candy Guard account, which uses a
      // variable-length guard encoding this composable does not decode. They
      // are reported as null/0n rather than fabricated.
      candyMachine.value = {
        address: addr,
        itemsAvailable,
        itemsMinted,
        itemsRemaining: itemsAvailable - itemsMinted,
        price: 0n,
        goLiveDate: null,
        isActive: itemsMinted < itemsAvailable,
        isSoldOut: itemsMinted >= itemsAvailable,
      }
    } catch (err) {
      if (currentRequest !== requestId) return
      error.value = err as Error
      candyMachine.value = null
    } finally {
      if (currentRequest === requestId) {
        loading.value = false
      }
    }
  }

  onMounted(fetchCandyMachine)
  watch(() => toValue(address), fetchCandyMachine)

  return {
    candyMachine,
    loading,
    error,
    refetch: fetchCandyMachine,
  }
}
