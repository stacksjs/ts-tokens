import type { CommonProps } from '../types'
import React from 'react'

export interface ExplorerLinkProps extends CommonProps {
  signature?: string
  address?: string
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet'
}

export function ExplorerLink({ signature, address, cluster = 'devnet', className, style }: ExplorerLinkProps): JSX.Element {
  const baseUrl = 'https://explorer.solana.com'
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`

  const url = signature
    ? `${baseUrl}/tx/${signature}${clusterParam}`
    : address
      ? `${baseUrl}/address/${address}${clusterParam}`
      : '#'

  const label = signature ? `${signature.slice(0, 8)}...` : address ? `${address.slice(0, 8)}...` : 'View'

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className} style={{ color: '#1976D2', textDecoration: 'none', ...style }}>
      {label}
    </a>
  )
}
