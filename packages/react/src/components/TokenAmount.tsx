import React from 'react'
import type { CommonProps } from '../types'

export interface TokenAmountProps extends CommonProps {
  amount: number | bigint
  decimals?: number
  displayDecimals?: number
  symbol?: string
  showSymbol?: boolean
}

export function TokenAmount({ amount, decimals = 9, displayDecimals = 4, symbol, showSymbol = true, className, style }: TokenAmountProps): JSX.Element {
  const value = typeof amount === 'bigint'
    ? Number(amount) / Math.pow(10, decimals)
    : amount

  return (
    <span className={className} style={style}>
      {value.toFixed(displayDecimals)} {showSymbol && symbol && symbol}
    </span>
  )
}
