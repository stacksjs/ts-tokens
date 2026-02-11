import React, { useState } from 'react'
import type { CommonProps } from '../types'
import { useTokenBalance, useTransaction } from '../hooks'

export interface TokenTransferFormProps extends CommonProps {
  mint: string
  owner: string
  onTransfer?: (signature: string) => void
}

export function TokenTransferForm({ mint, owner, onTransfer, className, style }: TokenTransferFormProps): JSX.Element {
  const { uiBalance, decimals, loading: balanceLoading } = useTokenBalance(mint, owner)
  const { pending, error, send, reset } = useTransaction()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    reset()

    if (!recipient.trim()) {
      setValidationError('Recipient address is required')
      return
    }

    const numAmount = Number(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Please enter a valid amount')
      return
    }

    if (numAmount > uiBalance) {
      setValidationError(`Insufficient balance: ${uiBalance} available`)
      return
    }

    try {
      // The actual transaction building would be done by the consumer
      // This form manages the UI state and validation
      const sig = await send(new Uint8Array())
      onTransfer?.(sig)
    } catch {
      // Error is captured in the hook state
    }
  }

  return (
    <form className={className} style={style} onSubmit={handleSubmit}>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Recipient</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Wallet address"
          style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
          Amount {!balanceLoading && <span style={{ color: '#666' }}>(Balance: {uiBalance})</span>}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step={Math.pow(10, -decimals)}
          min={0}
          style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
        />
      </div>
      {validationError && <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 8 }}>{validationError}</div>}
      {error && <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 8 }}>{error.message}</div>}
      <button type="submit" disabled={pending || balanceLoading}>
        {pending ? 'Sending...' : 'Transfer'}
      </button>
    </form>
  )
}
