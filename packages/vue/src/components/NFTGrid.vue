<script setup lang="ts">
import { useNFTs } from '../composables'
import NFTCard from './NFTCard.vue'

const props = withDefaults(defineProps<{
  owner: string
  columns?: number
}>(), {
  columns: 3,
})

const { nfts, loading, error } = useNFTs(props.owner)
</script>

<template>
  <div v-if="loading" role="status" aria-label="Loading NFTs">Loading NFTs...</div>
  <div v-else-if="error" role="alert">Error: {{ error.message }}</div>
  <div v-else-if="nfts.length === 0">No NFTs found</div>
  <div v-else :style="{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '16px' }" role="list" aria-label="NFT collection">
    <div v-for="nft in nfts" :key="nft.mint" role="listitem">
      <NFTCard :mint="nft.mint" />
    </div>
  </div>
</template>
