import { useState, useEffect, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
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
  const [ownPower, setOwnPower] = useState<bigint>(0n)
  const [delegatedPower, setDelegatedPower] = useState<bigint>(0n)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPower = useCallback(async () => {
    if (!voterAddress) { setLoading(false); return }
    try {
      setLoading(true)
      setError(null)
      // In production, query voting power
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [connection, daoAddress, voterAddress])

  useEffect(() => { fetchPower() }, [fetchPower])

  return { ownPower, delegatedPower, totalPower: ownPower + delegatedPower, loading, error, refetch: fetchPower }
}
