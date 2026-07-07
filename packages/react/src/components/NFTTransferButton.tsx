import React, { useState } from 'react'
import type { CommonProps } from '../types'
import { useTransaction } from '../hooks'

export interface NFTTransferButtonProps extends CommonProps {
  mint: string
  /**
   * Builds and signs the transfer transaction, returning the serialized bytes
   * to submit. This component cannot build or sign a transaction on its own, so
   * a caller must supply it (typically wiring in a wallet-adapter signer).
   */
  buildTransaction?: (mint: string, recipient: string) => Promise<Uint8Array> | Uint8Array
  onTransfer?: (signature: string) => void
  disabled?: boolean
}

export function NFTTransferButton({ mint, buildTransaction, onTransfer, disabled, className, style }: NFTTransferButtonProps): JSX.Element {
  const { pending, error, send, reset } = useTransaction()
  const [showInput, setShowInput] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleTransfer = async () => {
    if (!recipient.trim()) return
    reset()
    setLocalError(null)
    if (!buildTransaction) {
      setLocalError('Transfer is not wired up: provide a buildTransaction prop to sign and submit the transaction.')
      return
    }

    try {
      const tx = await buildTransaction(mint, recipient.trim())
      const sig = await send(tx)
      onTransfer?.(sig)
      setShowInput(false)
      setRecipient('')
    } catch {
      // Error captured in hook
    }
  }

  if (!showInput) {
    return (
      <button
        className={className}
        style={style}
        onClick={() => setShowInput(true)}
        disabled={disabled || pending}
      >
        Transfer NFT
      </button>
    )
  }

  return (
    <div className={className} style={style}>
      <input
        type="text"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient address"
        style={{ padding: '6px 8px', marginRight: 8 }}
      />
      <button onClick={handleTransfer} disabled={pending || !recipient.trim()}>
        {pending ? 'Sending...' : 'Send'}
      </button>
      <button onClick={() => { setShowInput(false); setRecipient('') }} style={{ marginLeft: 4 }}>
        Cancel
      </button>
      {localError && <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 4 }}>{localError}</div>}
      {error && <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 4 }}>{error.message}</div>}
    </div>
  )
}
