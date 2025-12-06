import type { CandyMachineProps } from '../types'
import React from 'react'
import { useCandyMachine } from '../hooks'

export function MintCounter({ candyMachine, className, style }: CandyMachineProps): JSX.Element {
  const { candyMachine: cm, loading } = useCandyMachine(candyMachine)

  if (loading)
    return <span className={className} style={style}>...</span>
  if (!cm)
    return <span className={className} style={style}>-</span>

  return (
    <span className={className} style={style}>
      {cm.itemsMinted}
      {' '}
      /
      {cm.itemsAvailable}
    </span>
  )
}
