import React from 'react'
import type { CandyMachineProps } from '../types'
import { useCandyMachine } from '../hooks'
import { formatFixed } from '../utils/format'

export interface MintPriceProps extends CandyMachineProps {
  showSymbol?: boolean
  decimals?: number
}

export function MintPrice({ candyMachine, showSymbol = true, decimals = 4, className, style }: MintPriceProps): JSX.Element {
  const { candyMachine: cm, loading } = useCandyMachine(candyMachine)

  if (loading) return <span className={className} style={style}>...</span>
  if (!cm) return <span className={className} style={style}>--</span>

  // Convert lamports (9 decimals) to SOL with a bigint-safe formatter.
  const price = formatFixed(cm.price, 9, decimals)

  return (
    <span className={className} style={style}>
      {price} {showSymbol && 'SOL'}
    </span>
  )
}
