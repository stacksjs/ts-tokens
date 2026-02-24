import { ref, onMounted, type Ref } from 'vue'
import { PublicKey } from '@solana/web3.js'
import { useConnection } from './useConnection'

export interface UseTreasuryReturn {
  solBalance: Ref<number>
  tokens: Ref<Array<{ mint: string; amount: bigint }>>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

export function useTreasury(_daoAddress: string): UseTreasuryReturn {
  const _connection = useConnection()
  const solBalance = ref<number>(0)
  const tokens = ref<Array<{ mint: string; amount: bigint }>>([])
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchTreasury = async (): Promise<void> => {
    try {
      loading.value = true
      error.value = null
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchTreasury)
  return { solBalance, tokens, loading, error, refetch: fetchTreasury }
}
