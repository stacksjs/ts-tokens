import React, { useState } from 'react'
import type { CommonProps } from '../types'
import { useTransaction } from '../hooks'

export interface NFTBurnButtonProps extends CommonProps {
  mint: string
  /**
   * Builds and signs the burn transaction, returning the serialized bytes to
   * submit. This component cannot build or sign a transaction on its own, so a
   * caller must supply it (typically wiring in a wallet-adapter signer).
   */
  buildTransaction?: (mint: string) => Promise<Uint8Array> | Uint8Array
  onBurn?: (signature: string) => void
  disabled?: boolean
}

export function NFTBurnButton({ mint, buildTransaction, onBurn, disabled, className, style }: NFTBurnButtonProps): JSX.Element {
  const { pending, error, send, reset } = useTransaction()
  const [showConfirm, setShowConfirm] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleBurn = async () => {
    reset()
    setLocalError(null)
    if (!buildTransaction) {
      setLocalError('Burn is not wired up: provide a buildTransaction prop to sign and submit the transaction.')
      return
    }
    try {
      const tx = await buildTransaction(mint)
      const sig = await send(tx)
      onBurn?.(sig)
      setShowConfirm(false)
    } catch {
      // Error captured in hook
    }
  }

  if (!showConfirm) {
    return (
      <button
        className={className}
        style={{ color: '#e74c3c', ...style }}
        onClick={() => setShowConfirm(true)}
        disabled={disabled || pending}
      >
        Burn NFT
      </button>
    )
  }

  return (
    <div className={className} style={style}>
      <p style={{ margin: '0 0 8px', fontSize: 14 }}>
        Are you sure you want to burn this NFT? This action cannot be undone.
      </p>
      <button
        onClick={handleBurn}
        disabled={pending}
        style={{ color: '#fff', background: '#e74c3c', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', marginRight: 8 }}
      >
        {pending ? 'Burning...' : 'Confirm Burn'}
      </button>
      <button onClick={() => setShowConfirm(false)} style={{ padding: '6px 12px' }}>
        Cancel
      </button>
      {localError && <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 4 }}>{localError}</div>}
      {error && <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 4 }}>{error.message}</div>}
    </div>
  )
}
