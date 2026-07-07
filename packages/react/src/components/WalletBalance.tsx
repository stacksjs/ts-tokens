import React from 'react'
import type { CommonProps } from '../types'
import { useConnection } from '../context'

export interface WalletBalanceProps extends CommonProps {
  address: string
  showSymbol?: boolean
}

export function WalletBalance({ address, showSymbol = true, className, style }: WalletBalanceProps): JSX.Element {
  const [balance, setBalance] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<Error | null>(null)
  const connection = useConnection()

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchBalance = async () => {
      try {
        const { PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js')
        const pubkey = new PublicKey(address)
        const lamports = await connection.getBalance(pubkey)
        if (cancelled) return
        setBalance(lamports / LAMPORTS_PER_SOL)
      } catch (err) {
        if (!cancelled) setError(err as Error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchBalance()

    return () => { cancelled = true }
  }, [connection, address])

  if (loading) {
    return <span className={className} style={style}>...</span>
  }

  if (error || balance === null) {
    return <span className={className} style={style}>--{showSymbol ? ' SOL' : ''}</span>
  }

  return (
    <span className={className} style={style}>
      {balance.toFixed(4)} {showSymbol && 'SOL'}
    </span>
  )
}
