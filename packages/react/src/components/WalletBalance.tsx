import type { CommonProps } from '../types'
import React from 'react'
import { useConnection } from '../context'

export interface WalletBalanceProps extends CommonProps {
  address: string
  showSymbol?: boolean
}

export function WalletBalance({ address, showSymbol = true, className, style }: WalletBalanceProps): JSX.Element {
  const [balance, setBalance] = React.useState<number>(0)
  const connection = useConnection()

  React.useEffect(() => {
    const fetchBalance = async () => {
      const { PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js')
      const pubkey = new PublicKey(address)
      const lamports = await connection.getBalance(pubkey)
      setBalance(lamports / LAMPORTS_PER_SOL)
    }
    fetchBalance()
  }, [connection, address])

  return (
    <span className={className} style={style}>
      {balance.toFixed(4)}
      {' '}
      {showSymbol && 'SOL'}
    </span>
  )
}
