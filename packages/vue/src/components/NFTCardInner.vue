<script setup lang="ts">
import { useNFT } from '../composables'
import NFTCardView from './NFTCardView.vue'

const props = withDefaults(defineProps<{
  mint: string
  showDetails?: boolean
}>(), {
  showDetails: false,
})

const { nft, loading, error } = useNFT(() => props.mint)
</script>

<template>
  <div v-if="loading" role="status" aria-label="Loading NFT">Loading...</div>
  <div v-else-if="error" role="alert">Error loading NFT</div>
  <div v-else-if="!nft">NFT not found</div>
  <NFTCardView v-else :nft="nft" :show-details="showDetails" />
</template>
