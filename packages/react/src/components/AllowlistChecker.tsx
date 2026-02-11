import React, { useState, useEffect } from 'react'
import type { CandyMachineProps } from '../types'
import { useWallet } from '../hooks'
import { useCandyMachine } from '../hooks'

export interface AllowlistCheckerProps extends CandyMachineProps {
  allowlist?: string[]
  onResult?: (eligible: boolean) => void
}

export function AllowlistChecker({ candyMachine, allowlist, onResult, className, style }: AllowlistCheckerProps): JSX.Element {
  const { publicKey } = useWallet()
  const { candyMachine: cm, loading } = useCandyMachine(candyMachine)
  const [eligible, setEligible] = useState<boolean | null>(null)

  useEffect(() => {
    if (!publicKey || loading) {
      setEligible(null)
      return
    }

    const address = publicKey.toBase58()
    const isEligible = allowlist ? allowlist.includes(address) : true

    setEligible(isEligible)
    onResult?.(isEligible)
  }, [publicKey, loading, allowlist, onResult])

  if (!publicKey) {
    return <div className={className} style={style}>Connect your wallet to check eligibility</div>
  }

  if (loading) {
    return <div className={className} style={style}>Checking eligibility...</div>
  }

  if (eligible === null) {
    return <div className={className} style={style}>...</div>
  }

  return (
    <div
      className={className}
      style={{
        padding: '8px 12px',
        borderRadius: 4,
        background: eligible ? '#d4edda' : '#f8d7da',
        color: eligible ? '#155724' : '#721c24',
        ...style,
      }}
    >
      {eligible ? 'You are eligible to mint!' : 'Your wallet is not on the allowlist'}
    </div>
  )
}
