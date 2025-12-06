import type { CommonProps } from '../types'
import React from 'react'

export interface AddressDisplayProps extends CommonProps {
  address: string
  truncate?: boolean
  chars?: number
  copyable?: boolean
}

export function AddressDisplay({ address, truncate = true, chars = 4, copyable = true, className, style }: AddressDisplayProps): JSX.Element {
  const [copied, setCopied] = React.useState(false)

  const displayAddress = truncate ? `${address.slice(0, chars)}...${address.slice(-chars)}` : address

  const handleCopy = async () => {
    if (!copyable)
      return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className={className} style={{ cursor: copyable ? 'pointer' : 'default', fontFamily: 'monospace', ...style }} onClick={handleCopy} title={address}>
      {displayAddress}
      {' '}
      {copied && '✓'}
    </span>
  )
}
