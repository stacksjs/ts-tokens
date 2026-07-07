import { ref, computed, watch, onMounted, type ComputedRef, type Ref } from 'vue'
import { useConnection } from './useConnection'

export interface UseVotingPowerReturn {
  ownPower: Ref<bigint>
  delegatedPower: Ref<bigint>
  totalPower: ComputedRef<bigint>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

const GOVERNANCE_UNSUPPORTED
  = 'Voting power is not available: no on-chain governance program is deployed for this build.'

// eslint-disable-next-line no-unused-vars
export function useVotingPower(daoAddress: string, voterAddress: Ref<string> | string): UseVotingPowerReturn {
  // eslint-disable-next-line no-unused-vars
  const connection = useConnection()
  const ownPower = ref<bigint>(0n)
  const delegatedPower = ref<bigint>(0n)
  // Derive total from its parts so it never goes stale (mirrors React).
  const totalPower = computed<bigint>(() => ownPower.value + delegatedPower.value)
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchPower = async (): Promise<void> => {
    const voter = typeof voterAddress === 'string' ? voterAddress : voterAddress.value
    if (!voter) {
      loading.value = false
      return
    }
    loading.value = true
    // No governance program to query voting power — surface an honest
    // unsupported error rather than reporting a believable zero.
    ownPower.value = 0n
    delegatedPower.value = 0n
    error.value = new Error(GOVERNANCE_UNSUPPORTED)
    loading.value = false
  }

  onMounted(fetchPower)
  if (typeof voterAddress !== 'string') {
    watch(voterAddress, fetchPower)
  }
  return { ownPower, delegatedPower, totalPower, loading, error, refetch: fetchPower }
}
