import type { TokenProps } from '../types'
import React from 'react'

export function TokenInfo({ mint, className, style }: TokenProps): JSX.Element {
  const [info, setInfo] = React.useState<any>(null)

  React.useEffect(() => {
    const fetchInfo = async () => {
      const { getMintInfo, getConfig } = await import('ts-tokens')
      const config = await getConfig()
      const data = await getMintInfo(mint, config)
      setInfo(data)
    }
    fetchInfo()
  }, [mint])

  if (!info)
    return <div className={className} style={style}>Loading...</div>

  return (
    <div className={className} style={style}>
      <div>
        <strong>Mint:</strong>
        {' '}
        {mint}
      </div>
      <div>
        <strong>Supply:</strong>
        {' '}
        {info.supply?.toString()}
      </div>
      <div>
        <strong>Decimals:</strong>
        {' '}
        {info.decimals}
      </div>
      <div>
        <strong>Mint Authority:</strong>
        {' '}
        {info.mintAuthority || 'None'}
      </div>
      <div>
        <strong>Freeze Authority:</strong>
        {' '}
        {info.freezeAuthority || 'None'}
      </div>
    </div>
  )
}
