import React from 'react'
import type { CommonProps } from '../types'
import { useTokenAccounts } from '../hooks'

export interface TokenListProps extends CommonProps {
  owner: string
}

export function TokenList({ owner, className, style }: TokenListProps): JSX.Element {
  const { accounts, loading, error } = useTokenAccounts(owner)

  if (loading) return <div className={className} style={style} role="status" aria-label="Loading tokens">Loading tokens...</div>
  if (error) return <div className={className} style={style} role="alert">Error: {error.message}</div>
  if (accounts.length === 0) return <div className={className} style={style}>No tokens found</div>

  return (
    <div className={className} style={style} role="list" aria-label="Token accounts">
      {accounts.map((token) => (
        <div key={token.mint} role="listitem" style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
          <div><strong>{token.symbol || token.mint.slice(0, 8)}...</strong></div>
          <div>Balance: {token.uiBalance}</div>
        </div>
      ))}
    </div>
  )
}
