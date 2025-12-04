/**
 * useNFT Hook
 *
 * Fetch NFT metadata and display info.
 */

import { useState, useEffect, useCallback } from 'react'
import { useConnection, useConfig } from '../context'
import type { NFTDisplayInfo } from '../types'

/**
 * NFT state
 */
export interface NFTState {
  nft: NFTDisplayInfo | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * useNFT hook
 */
export function useNFT(mint: string): NFTState {
  const connection = useConnection()
  const config = useConfig()
  const [nft, setNFT] = useState<NFTDisplayInfo | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchNFT = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Import dynamically to avoid SSR issues
      const { getNFTMetadata, fetchOffChainMetadata } = await import('ts-tokens')

      const metadata = await getNFTMetadata(mint, config)
      if (!metadata) {
        throw new Error('NFT not found')
      }

      // Fetch off-chain metadata
      const offChain = await fetchOffChainMetadata(metadata.uri)

      setNFT({
        mint,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        image: (offChain as any)?.image,
        description: (offChain as any)?.description,
        attributes: (offChain as any)?.attributes,
      })
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [connection, config, mint])

  useEffect(() => {
    fetchNFT()
  }, [fetchNFT])

  return {
    nft,
    loading,
    error,
    refetch: fetchNFT,
  }
}
