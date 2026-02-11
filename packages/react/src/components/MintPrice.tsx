import React from 'react'
import type { CandyMachineProps } from '../types'
import { useCandyMachine } from '../hooks'

export interface MintPriceProps extends CandyMachineProps {
  showSymbol?: boolean
  decimals?: number
}

export function MintPrice({ candyMachine, showSymbol = true, decimals = 4, className, style }: MintPriceProps): JSX.Element {
  const { candyMachine: cm, loading } = useCandyMachine(candyMachine)

  if (loading) return <span className={className} style={style}>...</span>
  if (!cm) return <span className={className} style={style}>--</span>

  const price = Number(cm.price) / 1e9

  return (
    <span className={className} style={style}>
      {price.toFixed(decimals)} {showSymbol && 'SOL'}
    </span>
  )
}
