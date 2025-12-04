/**
 * useTransaction Composable
 *
 * Send and track transactions.
 */

import { ref, type Ref } from 'vue'
import { useConnection } from './useConnection'

/**
 * Transaction return type
 */
export interface UseTransactionReturn {
  pending: Ref<boolean>
  signature: Ref<string | null>
  error: Ref<Error | null>
  confirmed: Ref<boolean>
  send: (signedTransaction: Uint8Array) => Promise<string>
  reset: () => void
}

/**
 * useTransaction composable
 */
export function useTransaction(): UseTransactionReturn {
  const connection = useConnection()
  const pending = ref<boolean>(false)
  const signature = ref<string | null>(null)
  const error = ref<Error | null>(null)
  const confirmed = ref<boolean>(false)

  const send = async (signedTransaction: Uint8Array): Promise<string> => {
    try {
      pending.value = true
      error.value = null
      confirmed.value = false

      const sig = await connection.sendRawTransaction(signedTransaction)
      signature.value = sig

      const confirmation = await connection.confirmTransaction(sig, 'confirmed')

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`)
      }

      confirmed.value = true
      return sig
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      pending.value = false
    }
  }

  const reset = (): void => {
    pending.value = false
    signature.value = null
    error.value = null
    confirmed.value = false
  }

  return {
    pending,
    signature,
    error,
    confirmed,
    send,
    reset,
  }
}
