import React from 'react'
import type { NFTDisplayInfo, NFTProps } from '../types'
import { useNFT } from '../hooks'

/**
 * NFTCard props
 *
 * `nft` is optional: when provided (e.g. by NFTGrid, which already fetched
 * the list), the card renders it directly instead of refetching. When only
 * `mint` is given, the card fetches the NFT itself via `useNFT`.
 */
export interface NFTCardProps extends NFTProps {
  nft?: NFTDisplayInfo
}

export function NFTCard({ nft: providedNFT, ...rest }: NFTCardProps): JSX.Element {
  if (providedNFT) {
    return <NFTCardView nft={providedNFT} {...rest} />
  }
  return <NFTCardFetcher {...rest} />
}

function NFTCardFetcher({ mint, ...rest }: NFTProps): JSX.Element {
  const { nft, loading, error } = useNFT(mint)

  if (loading) return <div className={rest.className} style={rest.style} role="status" aria-label="Loading NFT">Loading...</div>
  if (error) return <div className={rest.className} style={rest.style} role="alert">Error loading NFT</div>
  if (!nft) return <div className={rest.className} style={rest.style}>NFT not found</div>

  return <NFTCardView nft={nft} {...rest} />
}

function NFTCardView({ nft, showDetails = false, className, style }: Omit<NFTCardProps, 'mint'> & { nft: NFTDisplayInfo }): JSX.Element {
  return (
    <div className={className} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', ...style }} role="article" aria-label={`NFT: ${nft.name}`}>
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
