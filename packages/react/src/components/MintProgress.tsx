import type { CandyMachineProps } from '../types'
import React from 'react'
import { useCandyMachine } from '../hooks'

export function MintProgress({ candyMachine, className, style }: CandyMachineProps): JSX.Element {
  const { candyMachine: cm, loading } = useCandyMachine(candyMachine)

  if (loading || !cm)
    return <div className={className} style={style} />

  const progress = (cm.itemsMinted / cm.itemsAvailable) * 100

  return (
    <div className={className} style={{ background: '#eee', borderRadius: '4px', overflow: 'hidden', ...style }}>
      <div style={{ width: `${progress}%`, height: '8px', background: '#4CAF50', transition: 'width 0.3s' }} />
    </div>
  )
}
