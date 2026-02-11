import React from 'react'
import type { TokenProps } from '../types'
import { useTokenBalance } from '../hooks'

export interface TokenBalanceProps extends TokenProps {
  owner: string
  showSymbol?: boolean
  symbol?: string
}

export function TokenBalance({ mint, owner, showSymbol, symbol, className, style }: TokenBalanceProps): JSX.Element {
  const { uiBalance, loading, error } = useTokenBalance(mint, owner)

  if (loading) return <span className={className} style={style} aria-busy={true} aria-label="Loading balance">...</span>
  if (error) return <span className={className} style={style} role="alert">Error</span>

  return (
    <span className={className} style={style} aria-label={`Token balance: ${uiBalance.toLocaleString()}${showSymbol && symbol ? ` ${symbol}` : ''}`}>
      {uiBalance.toLocaleString()} {showSymbol && symbol}
    </span>
  )
}
