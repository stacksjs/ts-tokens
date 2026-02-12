import { ref, onMounted, type Ref } from 'vue'
import { PublicKey } from '@solana/web3.js'
import { useConnection } from './useConnection'

export interface UseDAOReturn {
  name: Ref<string | null>
  proposalCount: Ref<number>
  totalVotingPower: Ref<bigint>
  config: Ref<{ votingPeriod: bigint; quorum: number; approvalThreshold: number; voteWeightType: string } | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

export function useDAO(daoAddress: string): UseDAOReturn {
  const connection = useConnection()
  const name = ref<string | null>(null)
  const proposalCount = ref<number>(0)
  const totalVotingPower = ref<bigint>(0n)
  const config = ref<UseDAOReturn['config']['value']>(null)
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchDAO = async (): Promise<void> => {
    try {
      loading.value = true
      error.value = null
      const pubkey = new PublicKey(daoAddress)
      const accountInfo = await connection.getAccountInfo(pubkey)
      if (!accountInfo) { name.value = null }
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchDAO)
  return { name, proposalCount, totalVotingPower, config, loading, error, refetch: fetchDAO }
}
