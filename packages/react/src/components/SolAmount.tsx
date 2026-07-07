import React from 'react'
import type { CommonProps } from '../types'
import { formatFixed } from '../utils/format'

export interface SolAmountProps extends CommonProps {
  amount: number | bigint
  decimals?: number
  showSymbol?: boolean
}

export function SolAmount({ amount, decimals = 4, showSymbol = true, className, style }: SolAmountProps): JSX.Element {
  // For bigint lamports, convert to SOL with a bigint-safe formatter (9 decimals
  // per SOL) so large balances above 2^53 are not rounded.
  const display = typeof amount === 'bigint'
    ? formatFixed(amount, 9, decimals)
    : amount.toFixed(decimals)

  return (
    <span className={className} style={style}>
      {display} {showSymbol && 'SOL'}
    </span>
  )
}
