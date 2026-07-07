import { ref, watch, onMounted, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import { PublicKey } from '@solana/web3.js'
import { useConnection } from './useConnection'

export interface UseDAOReturn {
  name: Ref<string | null>
  proposalCount: Ref<number>
  totalVotingPower: Ref<bigint>
  config: Ref<{ votingPeriod: bigint, quorum: number, approvalThreshold: number, voteWeightType: string } | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

const GOVERNANCE_UNSUPPORTED
  = 'DAO governance is not available: no on-chain governance program is deployed for this build.'

export function useDAO(daoAddress: MaybeRefOrGetter<string>): UseDAOReturn {
  const connection = useConnection()
  const name = ref<string | null>(null)
  const proposalCount = ref<number>(0)
  const totalVotingPower = ref<bigint>(0n)
  const config = ref<UseDAOReturn['config']['value']>(null)
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  // Cancellation guard so a slow older response can't overwrite newer state.
  let requestId = 0

  const fetchDAO = async (): Promise<void> => {
    const currentRequest = ++requestId
    const addr = toValue(daoAddress)

    try {
      loading.value = true
      error.value = null

      // Validate the address up-front so obviously bad input surfaces clearly.
      const pubkey = new PublicKey(addr)
      const accountInfo = await connection.getAccountInfo(pubkey)
      if (currentRequest !== requestId) return

      // Even when an account exists, there is no governance program able to
      // deserialize it, so we cannot return real DAO state. Surface an honest
      // error instead of fabricating zeros.
      name.value = null
      proposalCount.value = 0
      totalVotingPower.value = 0n
      config.value = null
      error.value = new Error(
        accountInfo ? GOVERNANCE_UNSUPPORTED : 'DAO account not found',
      )
    } catch (err) {
      if (currentRequest !== requestId) return
      error.value = err as Error
    } finally {
      if (currentRequest === requestId) {
        loading.value = false
      }
    }
  }

  onMounted(fetchDAO)
  watch(() => toValue(daoAddress), fetchDAO)

  return { name, proposalCount, totalVotingPower, config, loading, error, refetch: fetchDAO }
}
