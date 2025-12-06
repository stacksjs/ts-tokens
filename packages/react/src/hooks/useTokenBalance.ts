/**
 * useTokenBalance Hook
 *
 * Fetch and track token balance for an address.
 */

import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { useCallback, useEffect, useState } from 'react'
import { useConnection } from '../context'

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
  owner?: string,
): TokenBalanceState {
  const connection = useConnection()
  const [balance, setBalance] = useState<bigint>(0n)
  const [decimals, setDecimals] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchBalance = useCallback(async () => {
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

      // Get account info
      const account = await getAccount(connection, ata)
      setBalance(account.amount)

      // Get mint info for decimals
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey)
      if (mintInfo.value) {
        const data = (mintInfo.value.data as any).parsed?.info
        if (data) {
          setDecimals(data.decimals)
        }
      }
    }
    catch (err) {
      if ((err as Error).message?.includes('could not find account')) {
        // Account doesn't exist, balance is 0
        setBalance(0n)
      }
      else {
        setError(err as Error)
      }
    }
    finally {
      setLoading(false)
    }
  }, [connection, mint, owner])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  const uiBalance = Number(balance) / 10 ** decimals

  return {
    balance,
    uiBalance,
    decimals,
    loading,
    error,
    refetch: fetchBalance,
  }
}
