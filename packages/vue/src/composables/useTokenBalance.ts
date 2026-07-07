/**
 * useTokenBalance Composable
 *
 * Fetch and track token balance for an address.
 */

import { ref, watch, onMounted, type Ref } from 'vue'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token'
import { useConnection } from './useConnection'
import { formatUnits } from '../utils/format'

/**
 * Token balance return type
 */
export interface UseTokenBalanceReturn {
  balance: Ref<bigint>
  uiBalance: Ref<number>
  decimals: Ref<number>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

/**
 * useTokenBalance composable
 */
export function useTokenBalance(mint: string, owner: Ref<string> | string): UseTokenBalanceReturn {
  const connection = useConnection()
  const balance = ref<bigint>(0n)
  const decimals = ref<number>(0)
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)
  const uiBalance = ref<number>(0)

  // Cancellation guard so a slow older response can't overwrite newer state.
  let requestId = 0

  const fetchBalance = async (): Promise<void> => {
    const currentRequest = ++requestId
    const ownerValue = typeof owner === 'string' ? owner : owner.value
    if (!ownerValue) {
      loading.value = false
      return
    }

    try {
      loading.value = true
      error.value = null

      const mintPubkey = new PublicKey(mint)
      const ownerPubkey = new PublicKey(ownerValue)

      // Fetch decimals first so the balance-0 (no ATA) path still reports them.
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey)
      if (currentRequest !== requestId) return
      if (mintInfo.value) {
        const data = (mintInfo.value.data as any).parsed?.info
        if (data) {
          decimals.value = data.decimals
        }
      }

      try {
        const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)
        const account = await getAccount(connection, ata)
        if (currentRequest !== requestId) return
        balance.value = account.amount
      } catch (err) {
        // TokenAccountNotFoundError carries an EMPTY message, so it cannot be
        // matched by substring — check the error type instead.
        if (
          err instanceof TokenAccountNotFoundError
          || (err as Error)?.name === 'TokenAccountNotFoundError'
        ) {
          if (currentRequest !== requestId) return
          balance.value = 0n
        } else {
          throw err
        }
      }

      // Use a bigint-safe conversion instead of Number(balance) / 10 ** decimals
      // which loses precision above 2^53.
      uiBalance.value = Number(formatUnits(balance.value, decimals.value))
    } catch (err) {
      if (currentRequest !== requestId) return
      error.value = err as Error
    } finally {
      if (currentRequest === requestId) {
        loading.value = false
      }
    }
  }

  onMounted(fetchBalance)

  if (typeof owner !== 'string') {
    watch(owner, fetchBalance)
  }

  return {
    balance,
    uiBalance,
    decimals,
    loading,
    error,
    refetch: fetchBalance,
  }
}
