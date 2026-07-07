/**
 * useTransaction Hook
 *
 * Send and track transactions.
 */

import { useState, useCallback } from 'react'
import { useConnection } from '../context'
import type { TransactionState } from '../types'

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

      // Capture a recent blockhash so we can confirm against a valid block
      // height. The deprecated signature-only confirmTransaction can reject on
      // timeout even when the transaction actually landed.
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

      const sig = await connection.sendRawTransaction(signedTransaction)
      setSignature(sig)

      // Blockhash-based confirmation.
      const confirmation = await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        'confirmed'
      )

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }

      setConfirmed(true)
      return sig
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
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
