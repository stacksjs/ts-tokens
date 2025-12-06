import type { CommonProps } from '../types'
import React from 'react'

export interface SolAmountProps extends CommonProps {
  amount: number | bigint
  decimals?: number
  showSymbol?: boolean
}

export function SolAmount({ amount, decimals = 4, showSymbol = true, className, style }: SolAmountProps): JSX.Element {
  const value = typeof amount === 'bigint' ? Number(amount) / 1e9 : amount

  return (
    <span className={className} style={style}>
      {value.toFixed(decimals)}
      {' '}
      {showSymbol && 'SOL'}
    </span>
  )
}
