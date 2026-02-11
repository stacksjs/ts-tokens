import React from 'react'
import type { WalletProps } from '../types'
import { useWallet } from '../hooks'

export interface WalletConnectButtonProps extends WalletProps {
  label?: string
  disabled?: boolean
}

export function WalletConnectButton({ label, disabled, onConnect, className, style }: WalletConnectButtonProps): JSX.Element {
  const { connected, connecting, connect } = useWallet()

  const handleClick = async () => {
    if (disabled || connecting || connected) return
    await connect()
    onConnect?.()
  }

  const buttonText = connecting ? 'Connecting...' : connected ? 'Connected' : (label ?? 'Connect Wallet')

  return (
    <button
      className={className}
      style={style}
      onClick={handleClick}
      disabled={disabled || connecting || connected}
    >
      {buttonText}
    </button>
  )
}
