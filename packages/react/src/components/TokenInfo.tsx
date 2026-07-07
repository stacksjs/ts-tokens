import React from 'react'
import type { TokenProps } from '../types'
import { useConnection } from '../context'

export function TokenInfo({ mint, className, style }: TokenProps): JSX.Element {
  const connection = useConnection()
  const [info, setInfo] = React.useState<any>(null)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setInfo(null)
    setError(null)

    const fetchInfo = async () => {
      try {
        // Use the connection from TokensProvider so this component queries the
        // same cluster as its siblings rather than the global config's cluster.
        const { getMintInfo } = await import('ts-tokens')
        const data = await getMintInfo(connection, mint)
        if (!cancelled) setInfo(data)
      } catch (err) {
        if (!cancelled) setError(err as Error)
      }
    }
    fetchInfo()

    return () => { cancelled = true }
  }, [connection, mint])

  if (error) return <div className={className} style={style}>Error: {error.message}</div>
  if (!info) return <div className={className} style={style}>Loading...</div>

  return (
    <div className={className} style={style}>
      <div><strong>Mint:</strong> {mint}</div>
      <div><strong>Supply:</strong> {info.supply?.toString()}</div>
      <div><strong>Decimals:</strong> {info.decimals}</div>
      <div><strong>Mint Authority:</strong> {info.mintAuthority || 'None'}</div>
      <div><strong>Freeze Authority:</strong> {info.freezeAuthority || 'None'}</div>
    </div>
  )
}
