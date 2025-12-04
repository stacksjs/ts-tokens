/**
 * useNFT Composable
 *
 * Fetch NFT metadata and display info.
 */

import { ref, onMounted, type Ref } from 'vue'
import { useConnection, useConfig } from './useConnection'
import type { NFTDisplayInfo } from '../types'

/**
 * NFT return type
 */
export interface UseNFTReturn {
  nft: Ref<NFTDisplayInfo | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

/**
 * useNFT composable
 */
export function useNFT(mint: string): UseNFTReturn {
  const config = useConfig()
  const nft = ref<NFTDisplayInfo | null>(null)
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchNFT = async (): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      const { getNFTMetadata, fetchOffChainMetadata } = await import('ts-tokens')

      const metadata = await getNFTMetadata(mint, config)
      if (!metadata) {
        throw new Error('NFT not found')
      }

      const offChain = await fetchOffChainMetadata(metadata.uri)

      nft.value = {
        mint,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        image: (offChain as any)?.image,
        description: (offChain as any)?.description,
        attributes: (offChain as any)?.attributes,
      }
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchNFT)

  return {
    nft,
    loading,
    error,
    refetch: fetchNFT,
  }
}
