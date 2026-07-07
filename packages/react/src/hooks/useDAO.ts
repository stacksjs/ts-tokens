import { useState, useEffect, useCallback } from 'react'
import { useConnection } from '../context'

export interface DAOState {
  name: string | null
  address: string | null
  proposalCount: number
  totalVotingPower: bigint
  config: {
    votingPeriod: bigint
    quorum: number
    approvalThreshold: number
    voteWeightType: string
  } | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useDAO(daoAddress: string): DAOState {
  const connection = useConnection()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchDAO = useCallback(async () => {
    setLoading(true)
    // Governance account deserialization is not implemented. Surface an honest
    // error rather than returning fabricated zeros as a successful load.
    setError(new Error('DAO governance is not supported: the governance program is not deployed and DAO account decoding is not implemented.'))
    setLoading(false)
  }, [connection, daoAddress])

  useEffect(() => { fetchDAO() }, [fetchDAO])

  return {
    name: null,
    address: daoAddress,
    proposalCount: 0,
    totalVotingPower: 0n,
    config: null,
    loading,
    error,
    refetch: fetchDAO,
  }
}
