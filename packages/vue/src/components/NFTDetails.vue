<script setup lang="ts">
import { useNFT } from '../composables'

const props = defineProps<{
  mint: string
}>()

const { nft, loading, error } = useNFT(props.mint)
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else-if="!nft">NFT not found</div>
  <div v-else>
    <img v-if="nft.image" :src="nft.image" :alt="nft.name" style="max-width: 100%; border-radius: 8px;" />
    <h2>{{ nft.name }}</h2>
    <p><strong>Symbol:</strong> {{ nft.symbol }}</p>
    <p><strong>Mint:</strong> {{ mint }}</p>
    <p v-if="nft.description"><strong>Description:</strong> {{ nft.description }}</p>
    <div v-if="nft.attributes && nft.attributes.length > 0">
      <strong>Attributes:</strong>
      <ul>
        <li v-for="(attr, i) in nft.attributes" :key="i">{{ attr.trait_type }}: {{ attr.value }}</li>
      </ul>
    </div>
  </div>
</template>
