/**
 * useNFTs Composable
 *
 * Fetch all NFTs owned by an address.
 */

import { ref, watch, onMounted, type Ref } from 'vue'
import { useConfig } from './useConnection'
import type { NFTDisplayInfo } from '../types'

/**
 * NFTs return type
 */
export interface UseNFTsReturn {
  nfts: Ref<NFTDisplayInfo[]>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
}

/**
 * useNFTs composable
 */
export function useNFTs(owner: Ref<string> | string): UseNFTsReturn {
  const config = useConfig()
  const nfts = ref<NFTDisplayInfo[]>([])
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  const fetchNFTs = async (): Promise<void> => {
    const ownerValue = typeof owner === 'string' ? owner : owner.value
    if (!ownerValue) {
      loading.value = false
      return
    }

    try {
      loading.value = true
      error.value = null

      const { getNFTsByOwner, fetchOffChainMetadata } = await import('ts-tokens')

      const metadata = await getNFTsByOwner(ownerValue, config)

      const nftList: NFTDisplayInfo[] = await Promise.all(
        metadata.map(async (m) => {
          let offChain: any = null
          try {
            offChain = await fetchOffChainMetadata(m.uri)
          } catch {
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
        })
      )

      nfts.value = nftList
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchNFTs)

  if (typeof owner !== 'string') {
    watch(owner, fetchNFTs)
  }

  return {
    nfts,
    loading,
    error,
    refetch: fetchNFTs,
  }
}
