import React, { useState } from 'react'
import type { CommonProps } from '../types'

export interface DelegateFormProps extends CommonProps {
  daoAddress: string
  onDelegate?: (delegate: string, amount?: string) => void
}

export function DelegateForm({ daoAddress, onDelegate, className, style }: DelegateFormProps): JSX.Element {
  const [delegate, setDelegate] = useState('')
  const [amount, setAmount] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (delegate) onDelegate?.(delegate, amount || undefined)
  }

  return (
    <form className={className} style={style} onSubmit={handleSubmit} aria-label="Delegate voting power">
      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="delegate-address" style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Delegate to</label>
        <input id="delegate-address" type="text" value={delegate} onChange={(e) => setDelegate(e.target.value)} placeholder="Wallet address" required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="delegate-amount" style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Amount (optional)</label>
        <input id="delegate-amount" type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="All" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
      </div>
      <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}>Delegate</button>
    </form>
  )
}
