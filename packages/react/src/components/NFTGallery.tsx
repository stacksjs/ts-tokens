import React from 'react'
import type { CommonProps } from '../types'
import { useNFTs } from '../hooks'
import { NFTCard } from './NFTCard'

export interface NFTGalleryProps extends CommonProps {
  owner: string
  collection?: string
  columns?: number
}

export function NFTGallery({ owner, collection, columns = 3, className, style }: NFTGalleryProps): JSX.Element {
  const { nfts, loading, error } = useNFTs(owner)

  if (loading) return <div className={className} style={style}>Loading gallery...</div>
  if (error) return <div className={className} style={style}>Error: {error.message}</div>

  const filtered = collection
    ? nfts.filter(nft => nft.collection === collection)
    : nfts

  if (filtered.length === 0) {
    return <div className={className} style={style}>No NFTs found{collection ? ' in this collection' : ''}</div>
  }

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 16,
        ...style,
      }}
    >
      {filtered.map(nft => (
        <NFTCard key={nft.mint} mint={nft.mint} />
      ))}
    </div>
  )
}
