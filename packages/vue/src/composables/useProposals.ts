import { ref, onMounted, type Ref } from 'vue'
import { PublicKey } from '@solana/web3.js'
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

export function useProposals(_daoAddress: string): UseProposalsReturn {
  const _connection = useConnection()
  const proposals = ref<ProposalInfo[]>([])
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchProposals = async (): Promise<void> => {
    try {
      loading.value = true
      error.value = null
      proposals.value = []
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchProposals)
  return { proposals, loading, error, refetch: fetchProposals }
}
