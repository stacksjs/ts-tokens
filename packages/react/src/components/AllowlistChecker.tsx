import React, { useState, useEffect, useRef } from 'react'
import type { CandyMachineProps } from '../types'
import { useWallet } from '../hooks'

export interface AllowlistCheckerProps extends CandyMachineProps {
  allowlist?: string[]
  onResult?: (eligible: boolean) => void
}

export function AllowlistChecker({ allowlist, onResult, className, style }: AllowlistCheckerProps): JSX.Element {
  const { publicKey } = useWallet()
  const [eligible, setEligible] = useState<boolean | null>(null)

  // Keep onResult in a ref so an inline callback from the parent does not
  // re-run this effect (and potentially loop) on every parent render.
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  useEffect(() => {
    if (!publicKey) {
      setEligible(null)
      return
    }

    const address = publicKey.toBase58()
    const isEligible = allowlist ? allowlist.includes(address) : true

    setEligible(isEligible)
    onResultRef.current?.(isEligible)
  }, [publicKey, allowlist])

  if (!publicKey) {
    return <div className={className} style={style}>Connect your wallet to check eligibility</div>
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
