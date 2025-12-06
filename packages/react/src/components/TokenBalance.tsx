import type { TokenProps } from '../types'
import React from 'react'
import { useTokenBalance } from '../hooks'

export interface TokenBalanceProps extends TokenProps {
  owner: string
  showSymbol?: boolean
  symbol?: string
}

export function TokenBalance({ mint, owner, showSymbol, symbol, className, style }: TokenBalanceProps): JSX.Element {
  const { uiBalance, loading, error } = useTokenBalance(mint, owner)

  if (loading)
    return <span className={className} style={style}>...</span>
  if (error)
    return <span className={className} style={style}>Error</span>

  return (
    <span className={className} style={style}>
      {uiBalance.toLocaleString()}
      {' '}
      {showSymbol && symbol}
    </span>
  )
}
