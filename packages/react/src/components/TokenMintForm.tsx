import React, { useState } from 'react'
import type { CommonProps } from '../types'
import { useTransaction } from '../hooks'

export interface TokenMintFormProps extends CommonProps {
  mint: string
  /**
   * Builds and signs the mint transaction, returning the serialized bytes to
   * submit. This form only handles input and validation; it cannot build or
   * sign a transaction on its own, so a caller must supply it (typically wiring
   * in a wallet-adapter signer).
   */
  buildTransaction?: (params: { mint: string; amount: number; destination: string }) => Promise<Uint8Array> | Uint8Array
  onMint?: (signature: string) => void
}

export function TokenMintForm({ mint, buildTransaction, onMint, className, style }: TokenMintFormProps): JSX.Element {
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

    if (!buildTransaction) {
      setValidationError('Minting is not wired up: provide a buildTransaction prop to sign and submit the transaction.')
      return
    }

    try {
      const tx = await buildTransaction({ mint, amount: numAmount, destination: destination.trim() })
      const sig = await send(tx)
      onMint?.(sig)
    } catch {
      // Error is captured in the hook state
    }
  }

  return (
    <form className={className} style={style} onSubmit={handleSubmit}>
      <div style={{ marginBottom: 8 }}>
        <label htmlFor="token-mint-amount" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Amount to Mint</label>
        <input
          id="token-mint-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min={0}
          style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label htmlFor="token-mint-destination" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Destination (optional)</label>
        <input
          id="token-mint-destination"
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
