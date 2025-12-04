/**
 * useTokenBalance Composable
 *
 * Fetch and track token balance for an address.
 */

import { ref, watch, onMounted, type Ref } from 'vue'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import { useConnection } from './useConnection'

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

  const fetchBalance = async (): Promise<void> => {
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

      const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)
      const account = await getAccount(connection, ata)
      balance.value = account.amount

      const mintInfo = await connection.getParsedAccountInfo(mintPubkey)
      if (mintInfo.value) {
        const data = (mintInfo.value.data as any).parsed?.info
        if (data) {
          decimals.value = data.decimals
        }
      }

      uiBalance.value = Number(balance.value) / Math.pow(10, decimals.value)
    } catch (err) {
      if ((err as Error).message?.includes('could not find account')) {
        balance.value = 0n
        uiBalance.value = 0
      } else {
        error.value = err as Error
      }
    } finally {
      loading.value = false
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
