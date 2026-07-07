import React from 'react'
import type { CommonProps } from '../types'
import { useNFTs } from '../hooks'
import { NFTCard } from './NFTCard'

export interface NFTGalleryProps extends CommonProps {
  owner: string
  /**
   * @deprecated Collection filtering is not supported: useNFTs does not populate
   * a `collection` field, so this prop has no effect. All owned NFTs are shown.
   */
  collection?: string
  columns?: number
}

// eslint-disable-next-line no-unused-vars
export function NFTGallery({ owner, collection, columns = 3, className, style }: NFTGalleryProps): JSX.Element {
  const { nfts, loading, error } = useNFTs(owner)

  if (loading) return <div className={className} style={style}>Loading gallery...</div>
  if (error) return <div className={className} style={style}>Error: {error.message}</div>

  // Collection filtering is intentionally not applied: useNFTs does not populate
  // a `collection` field, so filtering here would always yield an empty gallery.
  // Render all owned NFTs instead of silently showing nothing.
  if (nfts.length === 0) {
    return <div className={className} style={style}>No NFTs found</div>
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
      {nfts.map(nft => (
        <NFTCard key={nft.mint} mint={nft.mint} />
      ))}
    </div>
  )
}
