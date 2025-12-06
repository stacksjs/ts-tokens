import type { NFTProps } from '../types'
import React from 'react'
import { useNFT } from '../hooks'

export function NFTDetails({ mint, className, style }: NFTProps): JSX.Element {
  const { nft, loading, error } = useNFT(mint)

  if (loading)
    return <div className={className} style={style}>Loading...</div>
  if (error) {
    return (
      <div className={className} style={style}>
        Error:
        {error.message}
      </div>
    )
  }
  if (!nft)
    return <div className={className} style={style}>NFT not found</div>

  return (
    <div className={className} style={style}>
      {nft.image && <img src={nft.image} alt={nft.name} style={{ maxWidth: '100%', borderRadius: '8px' }} />}
      <h2>{nft.name}</h2>
      <p>
        <strong>Symbol:</strong>
        {' '}
        {nft.symbol}
      </p>
      <p>
        <strong>Mint:</strong>
        {' '}
        {mint}
      </p>
      {nft.description && (
        <p>
          <strong>Description:</strong>
          {' '}
          {nft.description}
        </p>
      )}
      {nft.attributes && nft.attributes.length > 0 && (
        <div>
          <strong>Attributes:</strong>
          <ul>
            {nft.attributes.map((attr, i) => (
              <li key={i}>
                {attr.trait_type}
                :
                {' '}
                {attr.value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
