import React from 'react'
import type { CandyMachineProps } from '../types'
import { useCandyMachine } from '../hooks'

export interface MintButtonProps extends CandyMachineProps {
  onMint?: () => void
  disabled?: boolean
}

export function MintButton({ candyMachine, onMint, disabled, className, style }: MintButtonProps): JSX.Element {
  const { candyMachine: cm, loading } = useCandyMachine(candyMachine)
  const [minting, setMinting] = React.useState(false)

  const handleMint = async () => {
    if (disabled || minting || !cm || cm.isSoldOut) return
    setMinting(true)
    try {
      onMint?.()
    } finally {
      setMinting(false)
    }
  }

  const isDisabled = disabled || loading || minting || cm?.isSoldOut

  return (
    <button className={className} style={style} onClick={handleMint} disabled={isDisabled}>
      {loading ? 'Loading...' : minting ? 'Minting...' : cm?.isSoldOut ? 'Sold Out' : 'Mint'}
    </button>
  )
}
