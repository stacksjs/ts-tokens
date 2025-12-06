import type { CommonProps } from '../types'
import React from 'react'

export interface WalletAddressProps extends CommonProps {
  address: string
  truncate?: boolean
  chars?: number
}

export function WalletAddress({
  address,
  truncate = true,
  chars = 4,
  className,
  style,
}: WalletAddressProps): JSX.Element {
  const displayAddress = truncate
    ? `${address.slice(0, chars)}...${address.slice(-chars)}`
    : address

  return (
    <span className={className} style={style} title={address}>
      {displayAddress}
    </span>
  )
}
