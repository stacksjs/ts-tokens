<script setup lang="ts">
import type { NFTDisplayInfo } from '../types'

withDefaults(defineProps<{
  nft: NFTDisplayInfo
  showDetails?: boolean
}>(), {
  showDetails: false,
})
</script>

<template>
  <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;" role="article" :aria-label="`NFT: ${nft.name}`">
    <img v-if="nft.image" :src="nft.image" :alt="nft.name" style="width: 100%; aspect-ratio: 1;" />
    <div style="padding: 12px;">
      <h3 style="margin: 0 0 4px;">{{ nft.name }}</h3>
      <p style="margin: 0; color: #666; font-size: 14px;">{{ nft.symbol }}</p>
      <p v-if="showDetails && nft.description" style="margin: 8px 0 0; font-size: 12px;">{{ nft.description }}</p>
    </div>
  </div>
</template>
