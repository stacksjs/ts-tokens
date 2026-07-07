import React from 'react'
import type { CommonProps } from '../types'

export interface AddressDisplayProps extends CommonProps {
  address: string
  truncate?: boolean
  chars?: number
  copyable?: boolean
}

export function AddressDisplay({ address, truncate = true, chars = 4, copyable = true, className, style }: AddressDisplayProps): JSX.Element {
  const [copied, setCopied] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear any pending timer on unmount to avoid setState-after-unmount.
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const displayAddress = truncate ? `${address.slice(0, chars)}...${address.slice(-chars)}` : address

  const handleCopy = async () => {
    if (!copyable) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    // Reset any in-flight timer so rapid clicks do not stack timeouts.
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span
      className={className}
      style={{ cursor: copyable ? 'pointer' : 'default', fontFamily: 'monospace', ...style }}
      onClick={handleCopy}
      onKeyDown={(e) => { if (copyable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleCopy() } }}
      title={address}
      aria-label={`Address: ${address}${copyable ? '. Click to copy' : ''}`}
      role={copyable ? 'button' : undefined}
      tabIndex={copyable ? 0 : undefined}
    >
      {displayAddress} {copied && <span aria-live="polite">✓ Copied</span>}
    </span>
  )
}
