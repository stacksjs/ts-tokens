/**
 * useNFT Composable
 *
 * Fetch NFT metadata and display info.
 */

import { ref, watch, onMounted, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import { useConfig } from './useConnection'
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
export function useNFT(mint: MaybeRefOrGetter<string>): UseNFTReturn {
  const config = useConfig()
  const nft = ref<NFTDisplayInfo | null>(null)
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  // Cancellation guard so a slow older response can't overwrite newer state.
  let requestId = 0

  const fetchNFT = async (): Promise<void> => {
    const currentRequest = ++requestId
    const mintValue = toValue(mint)

    try {
      loading.value = true
      error.value = null

      const { getNFTMetadata, fetchOffChainMetadata } = await import('ts-tokens')

      const metadata = await getNFTMetadata(mintValue, config)
      if (currentRequest !== requestId) return
      if (!metadata) {
        throw new Error('NFT not found')
      }

      const offChain = await fetchOffChainMetadata(metadata.uri)
      if (currentRequest !== requestId) return

      nft.value = {
        mint: mintValue,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        image: (offChain as any)?.image,
        description: (offChain as any)?.description,
        attributes: (offChain as any)?.attributes,
      }
    } catch (err) {
      if (currentRequest !== requestId) return
      error.value = err as Error
    } finally {
      if (currentRequest === requestId) {
        loading.value = false
      }
    }
  }

  onMounted(fetchNFT)
  watch(() => toValue(mint), fetchNFT)

  return {
    nft,
    loading,
    error,
    refetch: fetchNFT,
  }
}
