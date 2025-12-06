import type { TransactionToastProps } from '../types'
import React from 'react'

export function TransactionToast({ signature, status, message, explorerUrl, className, style }: TransactionToastProps): JSX.Element {
  const statusColors = { pending: '#FFA500', confirmed: '#4CAF50', error: '#F44336' }
  const statusText = { pending: 'Pending...', confirmed: 'Confirmed!', error: 'Failed' }

  return (
    <div className={className} style={{ padding: '12px', borderRadius: '8px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[status] }} />
        <span>{message || statusText[status]}</span>
      </div>
      {explorerUrl && (
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#666' }}>
          View on Explorer
        </a>
      )}
    </div>
  )
}
