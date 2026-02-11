<script setup lang="ts">
import { computed } from 'vue'
import { useNFTs } from '../composables'
import NFTCard from './NFTCard.vue'

const props = withDefaults(defineProps<{
  owner: string
  collection?: string
  columns?: number
}>(), {
  columns: 3,
})

const { nfts, loading, error } = useNFTs(props.owner)

const filtered = computed(() => {
  if (!props.collection) return nfts.value
  return nfts.value.filter(nft => nft.collection === props.collection)
})
</script>

<template>
  <div v-if="loading">Loading gallery...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else-if="filtered.length === 0">No NFTs found{{ collection ? ' in this collection' : '' }}</div>
  <div v-else :style="{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '16px' }">
    <NFTCard v-for="nft in filtered" :key="nft.mint" :mint="nft.mint" />
  </div>
</template>
