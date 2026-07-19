/**
 * useCandyMachine Hook
 *
 * Fetch Candy Machine state and info.
 */

import { useState, useEffect, useCallback } from 'react'
import { useConnection } from '../context'
import type { CandyMachineDisplayInfo } from '../types'

/**
 * Candy Machine state
 */
export interface CandyMachineState {
  candyMachine: CandyMachineDisplayInfo | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * useCandyMachine hook
 */
export function useCandyMachine(address: string): CandyMachineState {
  const connection = useConnection()
  const [candyMachine, setCandyMachine] = useState<CandyMachineDisplayInfo | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCandyMachine = useCallback(async (isCurrent: () => boolean = () => true) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch candy machine account data
      const { PublicKey } = await import('@solana/web3.js')
      const cmPubkey = new PublicKey(address)
      const accountInfo = await connection.getAccountInfo(cmPubkey)

      if (!isCurrent()) return

      if (!accountInfo) {
        throw new Error('Candy Machine not found')
      }

      // Deserialize the on-chain Candy Machine account using the real decoder
      // from the core package rather than fabricating values.
      const { programs } = await import('ts-tokens')
      const decoded = programs.candyMachine.deserializeCandyMachine(
        Buffer.from(accountInfo.data)
      )

      if (!isCurrent()) return

      const itemsAvailable = Number(decoded.data.itemsAvailable)
      const itemsMinted = Number(decoded.itemsRedeemed)

      setCandyMachine({
        address,
        itemsAvailable,
        itemsMinted,
        itemsRemaining: itemsAvailable - itemsMinted,
        // Price is defined by the associated Candy Guard, not the Candy Machine
        // account itself, so it is not available from this decode.
        price: 0n,
        // Go-live date is likewise a guard concern (startDate guard) and is not
        // stored on the Candy Machine account.
        goLiveDate: null,
        // Without guard evaluation we cannot assert an active mint window, so
        // report active only while items remain rather than always true.
        isActive: itemsMinted < itemsAvailable,
        isSoldOut: itemsMinted >= itemsAvailable,
      })
    } catch (err) {
      if (isCurrent()) setError(err as Error)
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [connection, address])

  useEffect(() => {
    let cancelled = false
    fetchCandyMachine(() => !cancelled)
    return () => { cancelled = true }
  }, [fetchCandyMachine])

  return {
    candyMachine,
    loading,
    error,
    refetch: () => fetchCandyMachine(),
  }
}
