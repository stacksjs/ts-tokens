<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import NFTCard from './NFTCard.vue'

const props = defineProps<{ owner: string }>()

interface NFTItem {
  mint: string
  name: string
  image?: string
}

const nfts = ref<NFTItem[]>([])
const loading = ref(false)
const error = ref('')

async function loadNFTs() {
  loading.value = true
  error.value = ''

  try {
    // In a real app, use getNFTsByOwner from ts-tokens:
    //
    // import { getNFTsByOwner } from 'ts-tokens'
    // const results = await getNFTsByOwner(props.owner, config)
    //
    // For demo purposes we show placeholder data.
    nfts.value = [
      { mint: 'Demo1111111111111111111111111111111111111111', name: 'Demo NFT #1' },
      { mint: 'Demo2222222222222222222222222222222222222222', name: 'Demo NFT #2' },
      { mint: 'Demo3333333333333333333333333333333333333333', name: 'Demo NFT #3' },
    ]
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

onMounted(loadNFTs)
watch(() => props.owner, loadNFTs)
</script>

<template>
  <div>
    <h2>Your NFTs</h2>
    <p v-if="loading">Loading NFTs...</p>
    <p v-else-if="error" style="color: red">{{ error }}</p>
    <p v-else-if="nfts.length === 0">No NFTs found for this wallet.</p>
    <div v-else class="gallery">
      <NFTCard
        v-for="nft in nfts"
        :key="nft.mint"
        :name="nft.name"
        :image="nft.image"
        :mint="nft.mint"
      />
    </div>
  </div>
</template>

<style scoped>
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
</style>
