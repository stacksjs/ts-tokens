import { useState, useEffect, useCallback } from 'react'
import { useConnection } from '../context'

export interface VotingPowerState {
  ownPower: bigint
  delegatedPower: bigint
  totalPower: bigint
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useVotingPower(daoAddress: string, voterAddress?: string): VotingPowerState {
  const connection = useConnection()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPower = useCallback(async () => {
    if (!voterAddress) { setLoading(false); return }
    setLoading(true)
    // Voting power resolution is not implemented. Surface an honest error
    // rather than returning zero power as a successful load.
    setError(new Error('Voting power is not supported: the governance program is not deployed and voting power resolution is not implemented.'))
    setLoading(false)
  }, [connection, daoAddress, voterAddress])

  useEffect(() => { fetchPower() }, [fetchPower])

  return { ownPower: 0n, delegatedPower: 0n, totalPower: 0n, loading, error, refetch: fetchPower }
}
