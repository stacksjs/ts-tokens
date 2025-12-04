/**
 * useCandyMachine Composable
 *
 * Fetch Candy Machine state and info.
 */

import { ref, onMounted, type Ref } from 'vue'
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
export function useCandyMachine(address: string): UseCandyMachineReturn {
  const connection = useConnection()
  const candyMachine = ref<CandyMachineDisplayInfo | null>(null)
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchCandyMachine = async (): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      const { PublicKey } = await import('@solana/web3.js')
      const cmPubkey = new PublicKey(address)
      const accountInfo = await connection.getAccountInfo(cmPubkey)

      if (!accountInfo) {
        throw new Error('Candy Machine not found')
      }

      // Parse candy machine data (simplified placeholder)
      const itemsAvailable = 1000
      const itemsMinted = 0

      candyMachine.value = {
        address,
        itemsAvailable,
        itemsMinted,
        itemsRemaining: itemsAvailable - itemsMinted,
        price: 0n,
        goLiveDate: null,
        isActive: true,
        isSoldOut: itemsMinted >= itemsAvailable,
      }
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchCandyMachine)

  return {
    candyMachine,
    loading,
    error,
    refetch: fetchCandyMachine,
  }
}
