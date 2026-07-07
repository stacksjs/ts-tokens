import { ref, onMounted, type Ref } from 'vue'
import { useConnection } from './useConnection'

export interface UseTreasuryReturn {
  solBalance: Ref<number>
  tokens: Ref<Array<{ mint: string, amount: bigint }>>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

const GOVERNANCE_UNSUPPORTED
  = 'Treasury data is not available: no on-chain governance program is deployed for this build.'

// eslint-disable-next-line no-unused-vars
export function useTreasury(daoAddress: string): UseTreasuryReturn {
  // eslint-disable-next-line no-unused-vars
  const connection = useConnection()
  const solBalance = ref<number>(0)
  const tokens = ref<Array<{ mint: string, amount: bigint }>>([])
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchTreasury = async (): Promise<void> => {
    loading.value = true
    // No governance program to resolve a treasury account — surface an honest
    // unsupported error rather than reporting a believable zero balance.
    solBalance.value = 0
    tokens.value = []
    error.value = new Error(GOVERNANCE_UNSUPPORTED)
    loading.value = false
  }

  onMounted(fetchTreasury)
  return { solBalance, tokens, loading, error, refetch: fetchTreasury }
}
