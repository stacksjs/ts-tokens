import React, { useState } from 'react'
import type { CommonProps } from '../types'
import { useTransaction } from '../hooks'

export interface NFTTransferButtonProps extends CommonProps {
  mint: string
  onTransfer?: (signature: string) => void
  disabled?: boolean
}

export function NFTTransferButton({ mint, onTransfer, disabled, className, style }: NFTTransferButtonProps): JSX.Element {
  const { pending, error, send, reset } = useTransaction()
  const [showInput, setShowInput] = useState(false)
  const [recipient, setRecipient] = useState('')

  const handleTransfer = async () => {
    if (!recipient.trim()) return
    reset()

    try {
      const sig = await send(new Uint8Array())
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
      {error && <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 4 }}>{error.message}</div>}
    </div>
  )
}
