import React, { useState, useRef, useEffect } from 'react'
import type { WalletProps } from '../types'
import { useWallet } from '../hooks'

export interface WalletMultiButtonProps extends WalletProps {
  label?: string
}

export function WalletMultiButton({ label, onConnect, onDisconnect, className, style }: WalletMultiButtonProps): JSX.Element {
  const { connected, connecting, publicKey, connect, disconnect } = useWallet()
  const [showDropdown, setShowDropdown] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleConnect = async () => {
    await connect()
    onConnect?.()
  }

  const handleDisconnect = async () => {
    await disconnect()
    setShowDropdown(false)
    onDisconnect?.()
  }

  if (!connected) {
    return (
      <button className={className} style={style} onClick={handleConnect} disabled={connecting} aria-label={connecting ? 'Connecting to wallet' : 'Connect wallet'} aria-busy={connecting}>
        {connecting ? 'Connecting...' : (label ?? 'Connect Wallet')}
      </button>
    )
  }

  const address = publicKey?.toBase58() ?? ''
  const truncated = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ''

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className={className} style={style} onClick={() => setShowDropdown(!showDropdown)} aria-expanded={showDropdown} aria-haspopup="true" aria-label="Wallet options">
        {truncated}
      </button>
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 4,
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 10,
          minWidth: 160,
        }}>
          <div style={{ padding: '8px 12px', fontSize: 12, color: '#666', borderBottom: '1px solid #eee' }}>
            {address}
          </div>
          <button
            onClick={handleDisconnect}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            aria-label="Disconnect wallet"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
