/**
 * useTokenAccounts Composable
 *
 * Fetch all token accounts for an owner.
 */

import { ref, watch, onMounted, type Ref } from 'vue'
import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useConnection } from './useConnection'
import type { TokenDisplayInfo } from '../types'

/**
 * Token accounts return type
 */
export interface UseTokenAccountsReturn {
  accounts: Ref<TokenDisplayInfo[]>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

/**
 * useTokenAccounts composable
 */
export function useTokenAccounts(owner: Ref<string> | string): UseTokenAccountsReturn {
  const connection = useConnection()
  const accounts = ref<TokenDisplayInfo[]>([])
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchAccounts = async (): Promise<void> => {
    const ownerValue = typeof owner === 'string' ? owner : owner.value
    if (!ownerValue) {
      loading.value = false
      return
    }

    try {
      loading.value = true
      error.value = null

      const ownerPubkey = new PublicKey(ownerValue)

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        ownerPubkey,
        { programId: TOKEN_PROGRAM_ID }
      )

      const tokens: TokenDisplayInfo[] = tokenAccounts.value
        .filter(({ account }: any) => {
          const info = account.data.parsed.info
          return !(info.tokenAmount.decimals === 0 && info.tokenAmount.uiAmount === 1)
        })
        .map(({ account }: any) => {
          const info = account.data.parsed.info
          return {
            mint: info.mint,
            name: '',
            symbol: '',
            decimals: info.tokenAmount.decimals,
            balance: BigInt(info.tokenAmount.amount),
            uiBalance: info.tokenAmount.uiAmount,
          }
        })

      accounts.value = tokens
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchAccounts)

  if (typeof owner !== 'string') {
    watch(owner, fetchAccounts)
  }

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
  }
}
