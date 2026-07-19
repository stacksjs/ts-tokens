<script setup lang="ts">
import type { NFTDisplayInfo } from '../types'
import NFTCardInner from './NFTCardInner.vue'
import NFTCardView from './NFTCardView.vue'

/**
 * NFTCard
 *
 * `nft` is optional: when provided (e.g. by NFTGallery, which already fetched
 * the list), the card renders it directly instead of refetching. When only
 * `mint` is given, the card fetches the NFT itself via `useNFT`.
 */
withDefaults(defineProps<{
  mint: string
  nft?: NFTDisplayInfo
  showDetails?: boolean
}>(), {
  nft: undefined,
  showDetails: false,
})
</script>

<template>
  <NFTCardView v-if="nft" :nft="nft" :show-details="showDetails" />
  <NFTCardInner v-else :mint="mint" :show-details="showDetails" />
</template>
