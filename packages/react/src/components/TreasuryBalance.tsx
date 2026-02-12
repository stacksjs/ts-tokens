import React from 'react'
import type { CommonProps } from '../types'
import { useTreasury } from '../hooks/useTreasury'

export interface TreasuryBalanceProps extends CommonProps {
  daoAddress: string
}

export function TreasuryBalance({ daoAddress, className, style }: TreasuryBalanceProps): JSX.Element {
  const { solBalance, tokens, loading, error } = useTreasury(daoAddress)

  if (loading) return <span className={className} style={style} aria-busy={true}>...</span>
  if (error) return <span className={className} style={style} role="alert">Error</span>

  return (
    <div className={className} style={style} aria-label="Treasury balance">
      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{solBalance.toFixed(4)} SOL</div>
      {tokens.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px' }}>
          {tokens.map((t) => (
            <li key={t.mint} style={{ fontSize: '14px', color: '#666' }}>{t.mint.slice(0, 8)}...: {t.amount.toString()}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
