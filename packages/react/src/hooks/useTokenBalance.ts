/**
 * useTokenBalance Hook
 *
 * Fetch and track token balance for an address.
 */

import { useState, useEffect, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token'
import { useConnection } from '../context'
import { formatUnits } from '../utils/format'

/**
 * Token balance state
 */
export interface TokenBalanceState {
  balance: bigint
  uiBalance: number
  decimals: number
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * useTokenBalance hook
 */
export function useTokenBalance(
  mint: string,
  owner?: string
): TokenBalanceState {
  const connection = useConnection()
  const [balance, setBalance] = useState<bigint>(0n)
  const [decimals, setDecimals] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchBalance = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!owner) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const mintPubkey = new PublicKey(mint)
      const ownerPubkey = new PublicKey(owner)

      // Get ATA
      const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)

      // Get mint info for decimals (fetch regardless of whether the ATA exists)
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey)
      if (!isCurrent()) return
      if (mintInfo.value) {
        const data = (mintInfo.value.data as any).parsed?.info
        if (data) {
          setDecimals(data.decimals)
        }
      }

      // Get account info
      try {
        const account = await getAccount(connection, ata)
        if (!isCurrent()) return
        setBalance(account.amount)
      } catch (err) {
        if (!isCurrent()) return
        // @solana/spl-token throws TokenAccountNotFoundError (with an empty
        // message) when the owner has no ATA for the mint yet. That is a
        // balance of 0, not an error.
        if (err instanceof TokenAccountNotFoundError || (err as Error)?.name === 'TokenAccountNotFoundError') {
          setBalance(0n)
        } else {
          throw err
        }
      }
    } catch (err) {
      if (isCurrent()) setError(err as Error)
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [connection, mint, owner])

  useEffect(() => {
    let cancelled = false
    fetchBalance(() => !cancelled)
    return () => { cancelled = true }
  }, [fetchBalance])

  // Exact conversion via string formatting to avoid Number precision loss for
  // amounts above 2^53.
  const uiBalance = Number(formatUnits(balance, decimals))

  return {
    balance,
    uiBalance,
    decimals,
    loading,
    error,
    refetch: () => fetchBalance(),
  }
}
