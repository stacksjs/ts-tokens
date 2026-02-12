import { useState, useEffect, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
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
  const [proposals, setProposals] = useState<ProposalInfo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // In production, would query program accounts
      setProposals([])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [connection, daoAddress])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  return { proposals, loading, error, refetch: fetchProposals }
}
