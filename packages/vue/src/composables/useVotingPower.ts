import { ref, watch, onMounted, type Ref } from 'vue'
import { PublicKey } from '@solana/web3.js'
import { useConnection } from './useConnection'

export interface UseVotingPowerReturn {
  ownPower: Ref<bigint>
  delegatedPower: Ref<bigint>
  totalPower: Ref<bigint>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

export function useVotingPower(_daoAddress: string, voterAddress: Ref<string> | string): UseVotingPowerReturn {
  const _connection = useConnection()
  const ownPower = ref<bigint>(0n)
  const delegatedPower = ref<bigint>(0n)
  const totalPower = ref<bigint>(0n)
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchPower = async (): Promise<void> => {
    const voter = typeof voterAddress === 'string' ? voterAddress : voterAddress.value
    if (!voter) { loading.value = false; return }
    try {
      loading.value = true
      error.value = null
      totalPower.value = ownPower.value + delegatedPower.value
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchPower)
  if (typeof voterAddress !== 'string') { watch(voterAddress, fetchPower) }
  return { ownPower, delegatedPower, totalPower, loading, error, refetch: fetchPower }
}
