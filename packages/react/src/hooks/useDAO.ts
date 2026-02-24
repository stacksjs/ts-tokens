import { useState, useEffect, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
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
  const [name, setName] = useState<string | null>(null)
  const [proposalCount, _setProposalCount] = useState<number>(0)
  const [totalVotingPower, _setTotalVotingPower] = useState<bigint>(0n)
  const [config, _setConfig] = useState<DAOState['config']>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchDAO = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const pubkey = new PublicKey(daoAddress)
      const accountInfo = await connection.getAccountInfo(pubkey)
      if (!accountInfo) {
        setName(null)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [connection, daoAddress])

  useEffect(() => { fetchDAO() }, [fetchDAO])

  return { name, address: daoAddress, proposalCount, totalVotingPower, config, loading, error, refetch: fetchDAO }
}
