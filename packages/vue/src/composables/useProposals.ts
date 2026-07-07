import { ref, onMounted, type Ref } from 'vue'
import { useConnection } from './useConnection'

export interface ProposalInfo {
  address: string
  title: string
  status: string
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  endTime: bigint
}

export interface UseProposalsReturn {
  proposals: Ref<ProposalInfo[]>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

const GOVERNANCE_UNSUPPORTED
  = 'Proposals are not available: no on-chain governance program is deployed for this build.'

// eslint-disable-next-line no-unused-vars
export function useProposals(daoAddress: string): UseProposalsReturn {
  // eslint-disable-next-line no-unused-vars
  const connection = useConnection()
  const proposals = ref<ProposalInfo[]>([])
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchProposals = async (): Promise<void> => {
    loading.value = true
    // No governance program to query — surface an honest unsupported error
    // rather than returning a believable empty list.
    proposals.value = []
    error.value = new Error(GOVERNANCE_UNSUPPORTED)
    loading.value = false
  }

  onMounted(fetchProposals)
  return { proposals, loading, error, refetch: fetchProposals }
}
