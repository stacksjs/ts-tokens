import type { NFTProps } from '../types'
import React from 'react'
import { useNFT } from '../hooks'

export function NFTCard({ mint, showDetails = false, className, style }: NFTProps): JSX.Element {
  const { nft, loading, error } = useNFT(mint)

  if (loading)
    return <div className={className} style={style}>Loading...</div>
  if (error)
    return <div className={className} style={style}>Error loading NFT</div>
  if (!nft)
    return <div className={className} style={style}>NFT not found</div>

  return (
    <div className={className} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', ...style }}>
      {nft.image && <img src={nft.image} alt={nft.name} style={{ width: '100%', aspectRatio: '1' }} />}
      <div style={{ padding: '12px' }}>
        <h3 style={{ margin: '0 0 4px' }}>{nft.name}</h3>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{nft.symbol}</p>
        {showDetails && nft.description && (
          <p style={{ margin: '8px 0 0', fontSize: '12px' }}>{nft.description}</p>
        )}
      </div>
    </div>
  )
}
