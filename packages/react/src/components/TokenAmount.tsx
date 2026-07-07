import React from 'react'
import type { CommonProps } from '../types'
import { formatFixed } from '../utils/format'

export interface TokenAmountProps extends CommonProps {
  amount: number | bigint
  decimals?: number
  displayDecimals?: number
  symbol?: string
  showSymbol?: boolean
}

export function TokenAmount({ amount, decimals = 9, displayDecimals = 4, symbol, showSymbol = true, className, style }: TokenAmountProps): JSX.Element {
  // For bigint base units, use a bigint-safe formatter so amounts above 2^53
  // are not rounded by a Number conversion.
  const display = typeof amount === 'bigint'
    ? formatFixed(amount, decimals, displayDecimals)
    : amount.toFixed(displayDecimals)

  return (
    <span className={className} style={style}>
      {display} {showSymbol && symbol && symbol}
    </span>
  )
}
