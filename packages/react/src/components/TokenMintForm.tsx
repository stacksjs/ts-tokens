import React, { useState } from 'react'
import type { CommonProps } from '../types'
import { useTransaction } from '../hooks'

export interface TokenMintFormProps extends CommonProps {
  mint: string
  onMint?: (signature: string) => void
}

export function TokenMintForm({ mint, onMint, className, style }: TokenMintFormProps): JSX.Element {
  const { pending, error, send, reset } = useTransaction()
  const [amount, setAmount] = useState('')
  const [destination, setDestination] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    reset()

    const numAmount = Number(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Please enter a valid amount')
      return
    }

    try {
      const sig = await send(new Uint8Array())
      onMint?.(sig)
    } catch {
      // Error is captured in the hook state
    }
  }

  return (
    <form className={className} style={style} onSubmit={handleSubmit}>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Amount to Mint</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min={0}
          style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Destination (optional)</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Wallet address (defaults to your wallet)"
          style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
        />
      </div>
      {validationError && <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 8 }}>{validationError}</div>}
      {error && <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 8 }}>{error.message}</div>}
      <button type="submit" disabled={pending}>
        {pending ? 'Minting...' : 'Mint Tokens'}
      </button>
    </form>
  )
}
