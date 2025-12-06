/**
 * useTransaction Hook
 *
 * Send and track transactions.
 */

import type { TransactionState } from '../types'
import { useCallback, useState } from 'react'
import { useConnection } from '../context'

/**
 * Transaction hook return type
 */
export interface UseTransactionReturn extends TransactionState {
  send: (signedTransaction: Uint8Array) => Promise<string>
  reset: () => void
}

/**
 * useTransaction hook
 */
export function useTransaction(): UseTransactionReturn {
  const connection = useConnection()
  const [pending, setPending] = useState<boolean>(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [confirmed, setConfirmed] = useState<boolean>(false)

  const send = useCallback(async (signedTransaction: Uint8Array): Promise<string> => {
    try {
      setPending(true)
      setError(null)
      setConfirmed(false)

      const sig = await connection.sendRawTransaction(signedTransaction)
      setSignature(sig)

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(sig, 'confirmed')

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`)
      }

      setConfirmed(true)
      return sig
    }
    catch (err) {
      setError(err as Error)
      throw err
    }
    finally {
      setPending(false)
    }
  }, [connection])

  const reset = useCallback(() => {
    setPending(false)
    setSignature(null)
    setError(null)
    setConfirmed(false)
  }, [])

  return {
    pending,
    signature,
    error,
    confirmed,
    send,
    reset,
  }
}
