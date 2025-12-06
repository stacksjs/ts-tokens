/**
 * useNFTs Hook
 *
 * Fetch all NFTs owned by an address.
 */

import type { NFTDisplayInfo } from '../types'
import { useCallback, useEffect, useState } from 'react'
import { useConfig, useConnection } from '../context'

/**
 * NFTs state
 */
export interface NFTsState {
  nfts: NFTDisplayInfo[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * useNFTs hook
 */
export function useNFTs(owner: string): NFTsState {
  const connection = useConnection()
  const config = useConfig()
  const [nfts, setNFTs] = useState<NFTDisplayInfo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchNFTs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { getNFTsByOwner, fetchOffChainMetadata } = await import('ts-tokens')

      const metadata = await getNFTsByOwner(owner, config)

      const nftList: NFTDisplayInfo[] = await Promise.all(
        metadata.map(async (m) => {
          let offChain: any = null
          try {
            offChain = await fetchOffChainMetadata(m.uri)
          }
          catch {
            // Ignore off-chain fetch errors
          }

          return {
            mint: m.mint,
            name: m.name,
            symbol: m.symbol,
            uri: m.uri,
            image: offChain?.image,
            description: offChain?.description,
            attributes: offChain?.attributes,
          }
        }),
      )

      setNFTs(nftList)
    }
    catch (err) {
      setError(err as Error)
    }
    finally {
      setLoading(false)
    }
  }, [connection, config, owner])

  useEffect(() => {
    fetchNFTs()
  }, [fetchNFTs])

  return {
    nfts,
    loading,
    error,
    refetch: fetchNFTs,
  }
}
