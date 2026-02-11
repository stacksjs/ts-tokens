import React from 'react'
import type { CommonProps } from '../types'
import { useNFTs } from '../hooks'
import { NFTCard } from './NFTCard'

export interface NFTGridProps extends CommonProps {
  owner: string
  columns?: number
}

export function NFTGrid({ owner, columns = 3, className, style }: NFTGridProps): JSX.Element {
  const { nfts, loading, error } = useNFTs(owner)

  if (loading) return <div className={className} style={style} role="status" aria-label="Loading NFTs">Loading NFTs...</div>
  if (error) return <div className={className} style={style} role="alert">Error: {error.message}</div>
  if (nfts.length === 0) return <div className={className} style={style}>No NFTs found</div>

  return (
    <div className={className} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '16px', ...style }} role="list" aria-label="NFT collection">
      {nfts.map((nft) => (
        <div key={nft.mint} role="listitem">
          <NFTCard mint={nft.mint} />
        </div>
      ))}
    </div>
  )
}
