import { useState, useEffect, useCallback } from 'react'
import { useConnection } from '../context'

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
  proposals: ProposalInfo[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useProposals(daoAddress: string): UseProposalsReturn {
  const connection = useConnection()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    // Querying proposal program accounts is not implemented. Surface an honest
    // error rather than returning an empty list as a successful load.
    setError(new Error('Proposals are not supported: the governance program is not deployed and proposal account queries are not implemented.'))
    setLoading(false)
  }, [connection, daoAddress])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  return { proposals: [], loading, error, refetch: fetchProposals }
}
