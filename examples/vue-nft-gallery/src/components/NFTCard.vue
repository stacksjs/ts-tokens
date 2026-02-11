<script setup lang="ts">
defineProps<{
  name: string
  image?: string
  mint: string
}>()
</script>

<template>
  <div class="nft-card">
    <div class="nft-image">
      <img v-if="image" :src="image" :alt="name" />
      <div v-else class="placeholder">No Image</div>
    </div>
    <div class="nft-info">
      <h3>{{ name }}</h3>
      <p class="mint">{{ mint.slice(0, 4) }}...{{ mint.slice(-4) }}</p>
    </div>
  </div>
</template>

<style scoped>
.nft-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  transition: box-shadow 0.2s;
}

.nft-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.nft-image {
  aspect-ratio: 1;
  background: #f1f5f9;
}

.nft-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
}

.nft-info {
  padding: 0.75rem;
}

.nft-info h3 {
  margin: 0 0 0.25rem;
  font-size: 0.9rem;
}

.mint {
  margin: 0;
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: monospace;
}
</style>
