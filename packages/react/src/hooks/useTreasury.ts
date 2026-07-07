import { useState, useEffect, useCallback } from 'react'
import { useConnection } from '../context'

export interface TreasuryState {
  solBalance: number
  tokens: Array<{ mint: string; amount: bigint }>
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useTreasury(daoAddress: string): TreasuryState {
  const connection = useConnection()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTreasury = useCallback(async () => {
    setLoading(true)
    // Treasury account resolution is not implemented. Surface an honest error
    // rather than returning a zero balance as a successful load.
    setError(new Error('Treasury is not supported: the governance program is not deployed and treasury balance resolution is not implemented.'))
    setLoading(false)
  }, [connection, daoAddress])

  useEffect(() => { fetchTreasury() }, [fetchTreasury])

  return { solBalance: 0, tokens: [], loading, error, refetch: fetchTreasury }
}
