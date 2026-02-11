<script setup lang="ts">
import { useNFT } from '../composables'

const props = withDefaults(defineProps<{
  mint: string
  showDetails?: boolean
}>(), {
  showDetails: false,
})

const { nft, loading, error } = useNFT(props.mint)
</script>

<template>
  <div v-if="loading" role="status" aria-label="Loading NFT">Loading...</div>
  <div v-else-if="error" role="alert">Error loading NFT</div>
  <div v-else-if="!nft">NFT not found</div>
  <div v-else style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;" role="article" :aria-label="`NFT: ${nft.name}`">
    <img v-if="nft.image" :src="nft.image" :alt="nft.name" style="width: 100%; aspect-ratio: 1;" />
    <div style="padding: 12px;">
      <h3 style="margin: 0 0 4px;">{{ nft.name }}</h3>
      <p style="margin: 0; color: #666; font-size: 14px;">{{ nft.symbol }}</p>
      <p v-if="showDetails && nft.description" style="margin: 8px 0 0; font-size: 12px;">{{ nft.description }}</p>
    </div>
  </div>
</template>
