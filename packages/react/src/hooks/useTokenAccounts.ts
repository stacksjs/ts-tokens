/**
 * useTokenAccounts Hook
 *
 * Fetch all token accounts for an owner.
 */

import { useState, useEffect, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useConnection } from '../context'
import type { TokenDisplayInfo } from '../types'

/**
 * Token accounts state
 */
export interface TokenAccountsState {
  accounts: TokenDisplayInfo[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * useTokenAccounts hook
 */
export function useTokenAccounts(owner: string): TokenAccountsState {
  const connection = useConnection()
  const [accounts, setAccounts] = useState<TokenDisplayInfo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const ownerPubkey = new PublicKey(owner)

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        ownerPubkey,
        { programId: TOKEN_PROGRAM_ID }
      )

      const tokens: TokenDisplayInfo[] = tokenAccounts.value
        .filter(({ account }) => {
          const info = account.data.parsed.info
          // Filter out NFTs (0 decimals, amount 1)
          return !(info.tokenAmount.decimals === 0 && info.tokenAmount.uiAmount === 1)
        })
        .map(({ account }) => {
          const info = account.data.parsed.info
          return {
            mint: info.mint,
            name: '', // Would need to fetch from metadata
            symbol: '',
            decimals: info.tokenAmount.decimals,
            balance: BigInt(info.tokenAmount.amount),
            uiBalance: info.tokenAmount.uiAmount,
          }
        })

      setAccounts(tokens)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [connection, owner])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
  }
}
