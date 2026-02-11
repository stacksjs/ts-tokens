import React from 'react'
import type { WalletProps } from '../types'
import { useWallet } from '../hooks'

export interface WalletDisconnectButtonProps extends WalletProps {
  label?: string
}

export function WalletDisconnectButton({ label, onDisconnect, className, style }: WalletDisconnectButtonProps): JSX.Element | null {
  const { connected, disconnect } = useWallet()

  if (!connected) return null

  const handleClick = async () => {
    await disconnect()
    onDisconnect?.()
  }

  return (
    <button className={className} style={style} onClick={handleClick}>
      {label ?? 'Disconnect'}
    </button>
  )
}
